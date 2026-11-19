import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  configurationSavedEntries,
  consumptionRegisteredEntry,
  consumptionVoidedEntry,
  customerCreatedEntry,
  customerDeactivatedEntry,
  pointsAdjustedEntry,
  pointsExpiredEntry,
  redemptionConfirmedEntry,
  redemptionExpiredEntry,
  redemptionRejectedEntry,
  redemptionUsedEntry,
  rewardCreatedEntry,
  rewardDisabledEntry,
  type CustomerSnapshot,
  type LoyaltyConfigSnapshot,
} from './audit/domain/audit-entries.js';
import type { AuditEntryInput } from './audit/domain/audit-entry.js';

// Datos de demostración para la presentación de regularidad. SOLO desarrollo.
//   1) npx prisma migrate reset   (con SEED_DEMO_DATA=false en .env: el seed base crea solo el Administrador)
//   2) npm run seed:demo
// No es re-ejecutable: audit_logs y points_movements son de solo inserción (triggers), así que no se
// pueden limpiar. Para repetirlo hay que resetear la base. Todo corre en una sola transacción: si algo
// falla, no queda nada a medias.
//
// Replica las reglas de PointsService / ConsumptionsService sobre datos con fechas pasadas:
// lotes FIFO, saldo = Σ lotes ACTIVE − deuda, lifetimePoints solo de consumos, el canje descuenta al usarse.
// Los textos de auditoría salen de los mismos armadores que usa la app.

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });
type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------------------------
// Parámetros de la demo
// ---------------------------------------------------------------------------------------------
const DEMO_DOMAIN = '@demo.vitto.club';
const BASE_AMOUNT = 1000; // $1.000 ...
const POINTS_AWARDED = 1; // ... = 1 punto
const BONUS_POINTS = 100; // bonificación fija de primera compra
const VALIDITY_MONTHS = 4; // con 6 meses de historia, los lotes viejos ya vencieron
const SILVER = 300;
const GOLD = 800;
const HISTORY_DAYS = 180;
const NOW = new Date();
const AR_OFFSET_H = 3; // Argentina = UTC−3

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261116);
const pick = <T>(items: T[]): T => items[Math.floor(rng() * items.length)];
const between = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const gauss = (): number => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

const minutes = (m: number) => m * 60_000;
const days = (d: number) => d * 86_400_000;
const daysAgo = (d: number, hourAR = 13, minute = 0): Date => {
  const date = new Date(NOW.getTime() - days(d));
  date.setUTCHours(hourAR + AR_OFFSET_H, minute, 0, 0);
  return date;
};
function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
// El proceso diario corre a las 00:05 de Argentina del día siguiente al vencimiento (03:05 UTC).
function expirationRunAt(lotExpiresAt: Date): Date {
  const run = new Date(lotExpiresAt.getTime());
  run.setUTCHours(AR_OFFSET_H, 5, 0, 0);
  if (run.getTime() <= lotExpiresAt.getTime()) run.setTime(run.getTime() + days(1));
  return run;
}
const roundTo500 = (n: number) => Math.round(n / 500) * 500;
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString('es-AR');

// Día de la semana en Argentina (0 = domingo)
const weekdayAR = (d: Date) => new Date(d.getTime() - AR_OFFSET_H * 3_600_000).getUTCDay();
const WEEKDAY_WEIGHT = [2.6, 0.7, 0.6, 0.8, 1, 1.9, 3]; // dom..sáb: de viernes a domingo, más gente
const HOUR_WEIGHTS: [number, number][] = [
  [12, 3], [13, 4], [14, 2], [17, 1], [18, 1.5], [20, 2], [21, 2],
]; // [hora AR, peso]: mediodía y noche

function randomHourAR(): number {
  const total = HOUR_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [hour, weight] of HOUR_WEIGHTS) {
    r -= weight;
    if (r <= 0) return hour;
  }
  return 13;
}

// Fecha de visita entre dos instantes: más densidad hacia hoy y más fines de semana
function randomVisit(from: Date, to: Date): Date {
  for (let i = 0; i < 200; i++) {
    const t = from.getTime() + (to.getTime() - from.getTime()) * Math.pow(rng(), 0.65);
    const candidate = new Date(t);
    candidate.setUTCHours(randomHourAR() + AR_OFFSET_H, between(0, 55), 0, 0);
    if (candidate.getTime() < from.getTime() || candidate.getTime() > to.getTime()) continue;
    if (rng() < WEEKDAY_WEIGHT[weekdayAR(candidate)] / 3) return candidate;
  }
  return new Date(to.getTime() - minutes(30));
}

// Reparte `total` en `n` montos de $500 en $500, alrededor del promedio, sumando exacto
function splitTotal(total: number, n: number, spread = 0.35): number[] {
  const avg = total / n;
  const amounts: number[] = [];
  let left = total;
  for (let i = 0; i < n - 1; i++) {
    // Múltiplos de $1.000: así el puntaje de cada personaje da exacto (se trunca cada consumo)
    const amount = Math.max(3000, Math.round((avg * (1 + (rng() * 2 - 1) * spread)) / 1000) * 1000);
    amounts.push(amount);
    left -= amount;
  }
  amounts.push(left);
  return amounts;
}

const FIRST_NAMES = ['Agustina', 'Bruno', 'Camila', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hernán', 'Inés', 'Julián', 'Karina', 'Leandro', 'Mariana', 'Nicolás', 'Octavio', 'Paula', 'Ramiro', 'Sabrina', 'Tomás', 'Valentina', 'Walter', 'Yamila', 'Zoe', 'Ailín', 'Braian', 'Candela', 'Damián', 'Emilia', 'Franco', 'Guadalupe', 'Ignacio', 'Jimena', 'Lautaro', 'Macarena', 'Noelia', 'Pablo', 'Rocío', 'Santiago', 'Triana', 'Ulises', 'Violeta', 'Ximena', 'Mateo', 'Luciana', 'Gonzalo', 'Florencia'];
const LAST_NAMES = ['Acosta', 'Benítez', 'Castro', 'Díaz', 'Escobar', 'Figueroa', 'Giménez', 'Herrera', 'Ibarra', 'Juárez', 'Luna', 'Medina', 'Navarro', 'Ojeda', 'Paredes', 'Quiroga', 'Romero', 'Sosa', 'Torres', 'Vega', 'Villalba', 'Ruiz', 'Maldonado', 'Cabrera', 'Molina', 'Rojas', 'Silva', 'Peralta', 'Ledesma', 'Funes', 'Bustos', 'Aguilera', 'Cardozo', 'Montenegro', 'Olmos', 'Salinas', 'Toledo', 'Arce', 'Barrera', 'Coria', 'Duarte', 'Farías', 'Godoy', 'Heredia', 'Ledezma', 'Mansilla'];

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------------------------------------
// Estado en memoria
// ---------------------------------------------------------------------------------------------
type LotStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'VOIDED';
type Lot = {
  id: number;
  initial: number;
  remaining: number;
  accreditedAt: Date;
  expiresAt: Date;
  status: LotStatus;
};
type Cons = { id: number; code: string; amount: number; total: number; status: 'REGISTERED' | 'VOIDED'; lot: Lot };
type Cust = {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string;
  birth: Date | null;
  createdAt: Date;
  hasAccount: boolean;
  active: boolean;
  id: number;
  balance: number;
  debt: number;
  lifetime: number;
  lots: Lot[];
  cons: Cons[];
};
type Emp = { id: number; accountId: number; name: string };
type Reward = {
  id: number;
  name: string;
  points: number;
  stock: number | null;
  usedCount: number;
  eligible: boolean; // entra en los canjes de relleno
};
type RedOutcome = 'USED' | 'EXPIRED' | 'REJECTED' | 'CANCELLED';
type Ev =
  | { at: Date; c: Cust; kind: 'CONS'; amount: number; by: Emp }
  | { at: Date; c: Cust; kind: 'VOID'; target: 'first' | 'recent'; by: Emp; reason: string }
  | { at: Date; c: Cust; kind: 'ADJ'; points: number; reason: string }
  | { at: Date; c: Cust; kind: 'RED'; reward: string | null; outcome: RedOutcome | null; origin: 'APP' | 'COUNTER'; by: Emp };

const snap = (c: Cust): CustomerSnapshot => ({
  id: c.id,
  firstName: c.firstName,
  lastName: c.lastName,
  documentType: 'DNI',
  documentNumber: c.dni,
  email: c.email,
  phone: c.phone,
  dateOfBirth: c.birth,
});

// ---------------------------------------------------------------------------------------------
// Programa
// ---------------------------------------------------------------------------------------------
async function main(): Promise<void> {
  assertLocalDatabase();
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error('Falta SEED_DEMO_PASSWORD (mínimo 8 caracteres): es la contraseña de los cajeros de demo.');
  }
  const existing = await prisma.customer.count({ where: { email: { endsWith: DEMO_DOMAIN } } });
  if (existing > 0) {
    throw new Error(
      'Ya hay datos de demo. audit_logs y points_movements no se pueden borrar: reseteá la base con ' +
        '`npx prisma migrate reset` y volvé a correr este script.',
    );
  }

  await prisma.$transaction(async (tx) => run(tx, demoPassword), { timeout: 10 * 60_000, maxWait: 60_000 });
  console.log('\nListo. Contraseña de los clientes con cuenta = su DNI.');
}

function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  const host = /@([^:/?]+)/.exec(url)?.[1] ?? '';
  if (!['localhost', '127.0.0.1', 'db', 'host.docker.internal'].includes(host)) {
    throw new Error(`DATABASE_URL apunta a "${host}": este script solo corre contra una base local.`);
  }
}

async function run(tx: Tx, demoPassword: string): Promise<void> {
  const cost = Number(process.env.BCRYPT_COST ?? 10);
  const auditNames = new Map<number, string>();
  const codes = new Set<string>();
  const counters = { skipped: [] as string[], redemptionCodes: [] as string[] };

  // ----- Administrador existente (lo crea el seed base) y cajeros de demo --------------------
  const adminEmployee = await tx.employee.findFirst({
    where: { role: 'ADMIN', isActive: true, account: { isNot: null } },
    include: { account: true },
    orderBy: { id: 'asc' },
  });
  if (!adminEmployee?.account) {
    throw new Error('No hay un Administrador con cuenta. Corré antes el seed base (`npx prisma db seed`).');
  }
  const admin: Emp = {
    id: adminEmployee.id,
    accountId: adminEmployee.account.id,
    name: `${adminEmployee.firstName} ${adminEmployee.lastName}`,
  };
  auditNames.set(admin.accountId, admin.name);

  const cashierHash = await bcrypt.hash(demoPassword, cost);
  const cashiers: Emp[] = [];
  for (const [i, data] of [
    { firstName: 'Luciano', lastName: 'Herrera', phone: '3511000101' },
    { firstName: 'Valeria', lastName: 'Domínguez', phone: '3511000102' },
    { firstName: 'Federico', lastName: 'Ríos', phone: '3511000103' },
  ].entries()) {
    const email = `${stripAccents(data.firstName)}.${stripAccents(data.lastName)}${DEMO_DOMAIN}`;
    const createdAt = daysAgo(HISTORY_DAYS + 5 - i);
    const employee = await tx.employee.create({ data: { ...data, email, role: 'CASHIER', createdAt } });
    const account = await tx.account.create({
      data: { email, passwordHash: cashierHash, role: 'CASHIER', employeeId: employee.id, createdAt },
    });
    const emp = { id: employee.id, accountId: account.id, name: `${data.firstName} ${data.lastName}` };
    auditNames.set(emp.accountId, emp.name);
    cashiers.push(emp);
  }
  const anyCashier = () => pick(cashiers);

  const audit = async (entry: AuditEntryInput, at: Date) => {
    const actorAccountId = entry.actor.type === 'EMPLOYEE' ? entry.actor.accountId : null;
    await tx.auditLog.create({
      data: {
        createdAt: at,
        actorType: entry.actor.type,
        actorAccountId,
        performedBy: actorAccountId === null ? 'Sistema' : (auditNames.get(actorAccountId) ?? 'Empleado'),
        module: entry.module,
        actionCode: entry.action,
        description: entry.description,
        affectedCustomerId: entry.affectedCustomer?.customerId ?? null,
        affectedCustomerName: entry.affectedCustomer?.name ?? null,
        documentType: entry.affectedCustomer?.documentType ?? null,
        documentNumber: entry.affectedCustomer?.documentNumber ?? null,
        operationCode: entry.operationCode ?? null,
        details: entry.details as unknown as Prisma.InputJsonValue,
      },
    });
  };
  const byEmployee = (e: Emp) => ({ type: 'EMPLOYEE' as const, accountId: e.accountId });
  const SYSTEM = { type: 'SYSTEM' as const };

  // ----- Configuración del programa (nueva versión activa) ----------------------------------
  const before: LoyaltyConfigSnapshot = {
    baseAmount: BASE_AMOUNT, pointsAwarded: POINTS_AWARDED, pointsExpirationMonths: 12,
    bonusType: null, bonusValue: null, silverMinPoints: SILVER, goldMinPoints: GOLD,
    bronzeBenefit: null, silverBenefit: null, goldBenefit: null,
  };
  const after: LoyaltyConfigSnapshot = {
    ...before,
    pointsExpirationMonths: VALIDITY_MONTHS,
    bonusType: 'FIXED_AMOUNT',
    bonusValue: BONUS_POINTS,
    bronzeBenefit: 'Acceso al programa de puntos y canjes',
    silverBenefit: 'Un café de cortesía en tu cumpleaños',
    goldBenefit: 'Reserva prioritaria los fines de semana',
  };
  const previous = await tx.loyaltyProgramConfiguration.findFirst({ where: { isActive: true } });
  const lastVersion = await tx.loyaltyProgramConfiguration.aggregate({ _max: { version: true } });
  const version = (lastVersion._max.version ?? 0) + 1;
  if (previous) {
    await tx.loyaltyProgramConfiguration.update({
      where: { id: previous.id },
      data: { isActive: false, validTo: NOW },
    });
  }
  await tx.loyaltyProgramConfiguration.create({
    data: {
      version,
      baseAmount: BASE_AMOUNT,
      pointsAwarded: POINTS_AWARDED,
      pointsExpirationMonths: VALIDITY_MONTHS,
      bonusType: 'FIXED_AMOUNT',
      bonusValue: BONUS_POINTS,
      silverMinPoints: SILVER,
      goldMinPoints: GOLD,
      bronzeBenefit: after.bronzeBenefit,
      silverBenefit: after.silverBenefit,
      goldBenefit: after.goldBenefit,
      frequentMinConsumptions: 3,
      isActive: true,
      validFrom: previous ? NOW : daysAgo(HISTORY_DAYS + 10),
    },
  });
  for (const [i, entry] of configurationSavedEntries(byEmployee(admin), before, after).entries()) {
    await audit(entry, new Date(daysAgo(HISTORY_DAYS + 2).getTime() + minutes(i * 3)));
  }

  // ----- Recompensas -------------------------------------------------------------------------
  const rewardDefs: {
    name: string; points: number; stock: number | null; description: string; eligible: boolean;
    status?: 'INACTIVE' | 'DISABLED'; reason?: 'OUT_OF_STOCK' | 'EXPIRED'; expiresAt?: string;
  }[] = [
    { name: 'Café + medialuna', points: 150, stock: null, description: 'Café con leche y una medialuna', eligible: true },
    { name: 'Cena para dos', points: 900, stock: 20, description: 'Plato principal y postre para dos', eligible: true },
    { name: 'Brunch', points: 700, stock: 1, description: 'Brunch completo de fin de semana', eligible: false },
    { name: 'Postre del día', points: 90, stock: null, description: 'El postre casero del día', eligible: true },
    { name: 'Porción de torta', points: 120, stock: 50, description: 'Una porción a elección', eligible: true },
    { name: 'Tabla de picada', points: 450, stock: 30, description: 'Tabla para compartir', eligible: true },
    { name: 'Jugo natural', points: 60, stock: null, description: 'Jugo de frutas de estación', eligible: true },
    { name: 'Menú del día', points: 250, stock: 0, description: 'Entrada, plato y bebida', eligible: false, status: 'DISABLED', reason: 'OUT_OF_STOCK' },
    { name: 'Vino de la casa', points: 500, stock: 12, description: 'Botella de vino de la casa', eligible: false, status: 'INACTIVE' },
    { name: 'Promo verano', points: 300, stock: null, description: 'Helado y bebida fría', eligible: false, status: 'DISABLED', reason: 'EXPIRED', expiresAt: dateOnly(new Date(NOW.getTime() - days(10))) },
  ];
  const rewards: Reward[] = [];
  for (const [i, def] of rewardDefs.entries()) {
    const createdAt = daysAgo(HISTORY_DAYS + 1 - i);
    const row = await tx.reward.create({
      data: {
        name: def.name, description: def.description, points: def.points, stock: def.stock,
        expiresAt: def.expiresAt ? new Date(def.expiresAt) : null,
        status: def.status ?? 'ACTIVE', disabledReason: def.reason ?? null,
        createdAt, updatedAt: createdAt,
      },
    });
    rewards.push({ id: row.id, name: def.name, points: def.points, stock: def.stock, usedCount: 0, eligible: def.eligible });
    await audit(
      rewardCreatedEntry(byEmployee(admin), { name: def.name, points: def.points, stock: def.stock, expiresAt: def.expiresAt ?? null }),
      createdAt,
    );
    if (def.reason) await audit(rewardDisabledEntry(def.name, def.reason), new Date(createdAt.getTime() + days(1)));
  }
  const rewardByName = (name: string) => rewards.find((r) => r.name === name)!;

  // ----- Clientes ----------------------------------------------------------------------------
  const usedDnis = new Set<string>(['40123456']);
  const customers: Cust[] = [];
  const events: Ev[] = [];
  const makeCustomer = (
    firstName: string, lastName: string, dni: string | null, createdAt: Date,
    opts: { account?: boolean; active?: boolean; birth?: Date | null } = {},
  ): Cust => {
    let doc = dni;
    while (!doc) {
      const candidate = String(between(20_000_000, 47_999_999));
      if (!usedDnis.has(candidate)) doc = candidate;
    }
    usedDnis.add(doc);
    const c: Cust = {
      firstName, lastName, dni: doc,
      email: `${stripAccents(firstName)}.${stripAccents(lastName)}.${doc.slice(-4)}${DEMO_DOMAIN}`,
      phone: `351${between(4000000, 6999999)}`,
      birth: opts.birth === undefined ? (rng() < 0.7 ? new Date(Date.UTC(between(1962, 2004), between(0, 11), between(1, 28))) : null) : opts.birth,
      createdAt, hasAccount: opts.account ?? false, active: opts.active ?? true,
      id: 0, balance: 0, debt: 0, lifetime: 0, lots: [], cons: [],
    };
    customers.push(c);
    return c;
  };

  // Personajes del guion --------------------------------------------------------------------
  const martina = makeCustomer('Martina', 'Gómez', '40123456', daysAgo(2, 11), { account: true, birth: new Date(Date.UTC(1996, 3, 12)) });
  const lucas = makeCustomer('Lucas', 'Ferreyra', null, daysAgo(80, 13), { account: true });
  const joaquin = makeCustomer('Joaquín', 'Paz', null, daysAgo(55, 13), { account: true });
  const sofia = makeCustomer('Sofía', 'Aguirre', null, daysAgo(100, 13), { account: true });
  const camila = makeCustomer('Camila', 'Ortiz', null, daysAgo(60, 13), { account: true }); // a 20 pts de Plata
  const nicolas = makeCustomer('Nicolás', 'Barrios', null, daysAgo(116, 13), { account: true }); // un lote vence en 5 días

  const timeline = (count: number, from: Date, to: Date): Date[] =>
    Array.from({ length: count }, () => randomVisit(from, to)).sort((a, b) => a.getTime() - b.getTime());
  const consumptions = (c: Cust, amounts: number[], dates: Date[]) =>
    amounts.forEach((amount, i) => events.push({ at: dates[i], c, kind: 'CONS', amount, by: anyCashier() }));

  // Lucas: 480 puntos, nivel Plata (100 de bonificación + $380.000 en 14 consumos)
  consumptions(lucas, splitTotal(380_000, 14, 0.3), timeline(14, daysAgo(78), daysAgo(2)));
  events.push({ at: new Date(NOW.getTime() - minutes(20)), c: lucas, kind: 'RED', reward: 'Café + medialuna', outcome: 'EXPIRED', origin: 'APP', by: anyCashier() });

  // Joaquín: saldo −120 por anulación (140 + 30 puntos, canje de 150, se anula el primer consumo)
  const j1 = anyCashier();
  events.push({ at: daysAgo(54, 13), c: joaquin, kind: 'CONS', amount: 40_000, by: j1 });
  events.push({ at: daysAgo(51, 20), c: joaquin, kind: 'CONS', amount: 30_000, by: j1 });
  events.push({ at: daysAgo(45, 13, 30), c: joaquin, kind: 'RED', reward: 'Café + medialuna', outcome: 'USED', origin: 'COUNTER', by: j1 });
  events.push({ at: daysAgo(20, 11), c: joaquin, kind: 'VOID', target: 'first', by: admin, reason: 'Error de carga: el monto cobrado era otro' });

  // Sofía: nivel Oro, 1.250 acumulados (100 + $1.150.000 en 36 consumos), saldo ≥ 600 tras dos canjes
  consumptions(sofia, splitTotal(1_150_000, 36, 0.3), timeline(36, daysAgo(99), daysAgo(1)));
  events.push({ at: daysAgo(30, 13), c: sofia, kind: 'RED', reward: 'Café + medialuna', outcome: 'USED', origin: 'COUNTER', by: anyCashier() });
  events.push({ at: daysAgo(12, 18), c: sofia, kind: 'RED', reward: 'Café + medialuna', outcome: 'USED', origin: 'APP', by: anyCashier() });

  // Camila: 280 acumulados (100 + $180.000 en 8 consumos): le faltan 20 para Plata
  consumptions(camila, splitTotal(180_000, 8, 0.3), timeline(8, daysAgo(58), daysAgo(1)));

  // Nicolás: primer lote acreditado hace (4 meses − 5 días): vence en 5 días
  const firstLotAt = addMonthsUTC(new Date(NOW.getTime() + days(5)), -VALIDITY_MONTHS);
  firstLotAt.setUTCHours(16, 20, 0, 0); // 13:20 AR
  events.push({ at: firstLotAt, c: nicolas, kind: 'CONS', amount: 22_000, by: anyCashier() });
  events.push({ at: daysAgo(3, 20), c: nicolas, kind: 'CONS', amount: 18_000, by: anyCashier() });
  nicolas.createdAt = new Date(firstLotAt.getTime() - minutes(5));

  // Relleno: 40 clientes activos (4 de ellos "fieles") y 5 dados de baja ----------------------
  const nameKey = new Set<string>();
  const randomName = (): [string, string] => {
    for (;;) {
      const first = pick(FIRST_NAMES), last = pick(LAST_NAMES);
      if (!nameKey.has(first + last)) { nameKey.add(first + last); return [first, last]; }
    }
  };
  for (const personaje of customers) nameKey.add(personaje.firstName + personaje.lastName);

  for (let i = 0; i < 40; i++) {
    const loyal = i < 4;
    const visitsCount = loyal ? between(26, 38) : between(2, 11);
    const start = loyal ? daysAgo(between(150, 175)) : daysAgo(between(10, HISTORY_DAYS - 5));
    const visits = timeline(visitsCount, start, NOW);
    const [first, last] = randomName();
    const c = makeCustomer(first, last, null, new Date(visits[0].getTime() - minutes(5)));
    for (const at of visits) {
      const amount = Math.min(28_000, Math.max(2_500, roundTo500(Math.exp(Math.log(8_500) + gauss() * 0.55))));
      events.push({ at, c, kind: 'CONS', amount, by: anyCashier() });
    }
    // Anulaciones (~4%), canjes y ajustes: se resuelven al procesar, según lo que tenga el cliente
    if (visitsCount > 3 && rng() < 0.12) {
      const at = new Date(visits[Math.floor(visits.length / 2)].getTime() + days(1));
      events.push({ at, c, kind: 'VOID', target: 'recent', by: rng() < 0.5 ? admin : anyCashier(), reason: pick(['Error de carga', 'Monto mal cargado', 'Cliente equivocado']) });
    }
    if (visitsCount >= 5) {
      for (let r = 0; r < (loyal ? between(4, 6) : between(1, 3)); r++) {
        events.push({ at: randomVisit(visits[Math.floor(visits.length * 0.4)], NOW), c, kind: 'RED', reward: null, outcome: null, origin: rng() < 0.55 ? 'APP' : 'COUNTER', by: anyCashier() });
      }
    }
    if (visitsCount >= 4 && rng() < 0.22) {
      events.push({
        at: randomVisit(visits[1], NOW), c, kind: 'ADJ',
        points: pick([+30, +50, +80, +100, -20, -40]),
        reason: pick(['Cortesía de la casa', 'Compensación por demora', 'Corrección de carga anterior', 'Promoción de fin de semana']),
      });
    }
  }
  const departed: Cust[] = [];
  for (let i = 0; i < 5; i++) {
    const [first, last] = randomName();
    departed.push(makeCustomer(first, last, null, daysAgo(between(120, 175)), { active: false }));
  }

  // ----- Alta de clientes y cuentas ----------------------------------------------------------
  for (const c of customers) {
    const row = await tx.customer.create({
      data: {
        firstName: c.firstName, lastName: c.lastName, documentType: 'DNI', documentNumber: c.dni,
        email: c.email, phone: c.phone, dateOfBirth: c.birth,
        isActive: c.active, createdAt: c.createdAt, updatedAt: c.createdAt,
      },
    });
    c.id = row.id;
    if (c.hasAccount) {
      await tx.account.create({
        data: {
          email: c.email, passwordHash: await bcrypt.hash(c.dni, cost), role: 'CUSTOMER',
          customerId: c.id, mustChangePassword: false, createdAt: c.createdAt,
        },
      });
    }
    await audit(customerCreatedEntry(byEmployee(anyCashier()), snap(c), 'CASHIER'), c.createdAt);
  }
  for (const c of departed) {
    const at = new Date(c.createdAt.getTime() + days(between(5, 40)));
    await tx.customer.update({ where: { id: c.id }, data: { deactivatedAt: at } });
    await tx.customerStatusChange.create({ data: { customerId: c.id, action: 'DEACTIVATED', createdAt: at } });
    await audit(customerDeactivatedEntry(byEmployee(admin), snap(c), 0), at);
  }

  // ----- Motor de puntos (réplica de PointsService) -----------------------------------------
  const codeFor = (id: number) => `C-${String(id).padStart(6, '0')}`;
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newRedemptionCode = (): string => {
    for (;;) {
      let code = '';
      for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(rng() * ALPHABET.length)];
      if (!codes.has(code)) { codes.add(code); return code; }
    }
  };

  const expireDue = async (c: Cust, upTo: Date) => {
    for (const lot of c.lots) {
      if (lot.status !== 'ACTIVE' || lot.remaining === 0) continue;
      const runAt = expirationRunAt(lot.expiresAt);
      if (runAt.getTime() > upTo.getTime()) continue;
      const expired = lot.remaining;
      lot.remaining = 0;
      lot.status = 'EXPIRED';
      c.balance -= expired;
      await tx.pointsLot.update({ where: { id: lot.id }, data: { remainingPoints: 0, status: 'EXPIRED', expiredAt: runAt } });
      await tx.pointsMovement.create({
        data: {
          customerId: c.id, lotId: lot.id, type: 'EXPIRATION', points: -expired, balanceAfter: c.balance,
          performedByAccountId: null, performedByName: 'Sistema', createdAt: runAt,
        },
      });
      await audit(pointsExpiredEntry(snap(c), { points: expired, accreditedAt: lot.accreditedAt, balanceAfter: c.balance }), runAt);
    }
  };

  const createLot = async (c: Cust, points: number, at: Date, consumptionId: number | null): Promise<Lot> => {
    const expiresAt = addMonthsUTC(at, VALIDITY_MONTHS);
    const row = await tx.pointsLot.create({
      data: {
        customerId: c.id, consumptionId, initialPoints: points, remainingPoints: points,
        accreditedAt: at, expiresAt, status: 'ACTIVE',
      },
    });
    const lot: Lot = { id: row.id, initial: points, remaining: points, accreditedAt: at, expiresAt, status: 'ACTIVE' };
    c.lots.push(lot);
    return lot;
  };

  // FIFO: primero los lotes que vencen antes
  const consumeFifo = async (c: Cust, points: number) => {
    let left = points;
    const active = c.lots.filter((l) => l.status === 'ACTIVE').sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
    for (const lot of active) {
      if (left === 0) break;
      const take = Math.min(lot.remaining, left);
      if (take === 0) continue;
      lot.remaining -= take;
      if (lot.remaining === 0) lot.status = 'CONSUMED';
      left -= take;
      await tx.pointsLot.update({ where: { id: lot.id }, data: { remainingPoints: lot.remaining, status: lot.status } });
    }
  };

  const stats = { consumptions: 0, voids: 0, adjustments: 0, redemptions: { USED: 0, EXPIRED: 0, REJECTED: 0, CANCELLED: 0 } };

  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const ev of events) {
    const { c, at } = ev;
    await expireDue(c, at);

    if (ev.kind === 'CONS') {
      if (c.debt > 0) throw new Error(`Cliente ${c.firstName} con deuda recibiendo un consumo: el guion no lo prevé`);
      const isFirst = !c.cons.some((x) => x.status === 'REGISTERED');
      const points = Math.floor((ev.amount / BASE_AMOUNT) * POINTS_AWARDED);
      const bonus = isFirst ? BONUS_POINTS : 0;
      const total = points + bonus;
      const row = await tx.consumption.create({
        data: {
          customerId: c.id, amount: ev.amount, points, bonusPoints: bonus, configurationVersion: version,
          baseAmount: BASE_AMOUNT, pointsAwarded: POINTS_AWARDED, status: 'REGISTERED',
          registeredByAccountId: ev.by.accountId, registeredByName: ev.by.name, createdAt: at,
        },
      });
      const lot = await createLot(c, total, at, row.id);
      c.balance += total;
      c.lifetime += total;
      await tx.pointsMovement.create({
        data: {
          customerId: c.id, consumptionId: row.id, lotId: lot.id, type: 'CONSUMPTION_CREDIT', points: total,
          balanceAfter: c.balance, performedByAccountId: ev.by.accountId, performedByName: ev.by.name, createdAt: at,
        },
      });
      const code = codeFor(row.id);
      c.cons.push({ id: row.id, code, amount: ev.amount, total, status: 'REGISTERED', lot });
      await audit(
        consumptionRegisteredEntry(byEmployee(ev.by), snap(c), {
          code, amount: ev.amount, baseAmount: BASE_AMOUNT, pointsAwarded: POINTS_AWARDED,
          totalPoints: total, bonusPoints: bonus, balanceAfter: c.balance,
        }),
        at,
      );
      stats.consumptions++;
    }

    if (ev.kind === 'VOID') {
      const registered = c.cons.filter((x) => x.status === 'REGISTERED');
      const target = ev.target === 'first' ? c.cons[0] : [...registered].slice(1).reverse().find((x) => x.lot.status === 'ACTIVE' && x.lot.remaining === x.lot.initial);
      if (!target || target.status !== 'REGISTERED' || target.lot.status === 'EXPIRED') {
        counters.skipped.push(`anulación de ${c.firstName} ${c.lastName}`);
        continue;
      }
      const deducted = Math.min(target.lot.remaining, target.total);
      const shortfall = target.total - deducted;
      target.lot.remaining -= deducted;
      target.lot.status = 'VOIDED';
      target.status = 'VOIDED';
      c.balance -= target.total;
      c.debt += shortfall;
      c.lifetime -= target.total;
      await tx.pointsLot.update({ where: { id: target.lot.id }, data: { remainingPoints: target.lot.remaining, status: 'VOIDED' } });
      await tx.consumption.update({
        where: { id: target.id },
        data: { status: 'VOIDED', voidedAt: at, voidedByAccountId: ev.by.accountId, voidedByName: ev.by.name, voidedReason: ev.reason },
      });
      await tx.pointsMovement.create({
        data: {
          customerId: c.id, consumptionId: target.id, lotId: target.lot.id, type: 'VOID_REVERSAL', points: -target.total,
          balanceAfter: c.balance, performedByAccountId: ev.by.accountId, performedByName: ev.by.name, createdAt: at,
        },
      });
      await audit(
        consumptionVoidedEntry(byEmployee(ev.by), snap(c), { code: target.code, amount: target.amount, totalPoints: target.total, balanceAfter: c.balance, reason: ev.reason }),
        at,
      );
      stats.voids++;
    }

    if (ev.kind === 'ADJ') {
      const actor = admin;
      if (ev.points > 0) {
        if (c.debt > 0) continue;
        const lot = await createLot(c, ev.points, at, null);
        c.balance += ev.points;
        await tx.pointsMovement.create({
          data: { customerId: c.id, lotId: lot.id, type: 'MANUAL_ADJUSTMENT', points: ev.points, balanceAfter: c.balance, reason: ev.reason, performedByAccountId: actor.accountId, performedByName: actor.name, createdAt: at },
        });
      } else {
        const take = -ev.points;
        if (c.balance < take) { counters.skipped.push(`ajuste de ${c.firstName} ${c.lastName}`); continue; }
        await consumeFifo(c, take);
        c.balance -= take;
        await tx.pointsMovement.create({
          data: { customerId: c.id, type: 'MANUAL_ADJUSTMENT', points: ev.points, balanceAfter: c.balance, reason: ev.reason, performedByAccountId: actor.accountId, performedByName: actor.name, createdAt: at },
        });
      }
      await audit(pointsAdjustedEntry(byEmployee(actor), snap(c), { points: ev.points, balanceAfter: c.balance, reason: ev.reason }), at);
      stats.adjustments++;
    }

    if (ev.kind === 'RED') {
      let outcome: RedOutcome = ev.outcome ?? 'USED';
      if (!ev.outcome) {
        const r = rng();
        outcome = r < 0.6 ? 'USED' : r < 0.75 ? 'EXPIRED' : r < 0.85 ? 'REJECTED' : 'CANCELLED';
      }
      const pool = ev.reward ? [rewardByName(ev.reward)] : rewards.filter((r) => r.eligible && r.points <= c.balance);
      const reward = pool.length > 0 ? pick(pool) : null;
      if (!reward || c.balance < reward.points) { counters.skipped.push(`canje de ${c.firstName} ${c.lastName}`); continue; }

      const code = newRedemptionCode();
      const expiresAt = new Date(at.getTime() + minutes(15));
      const resolvedAt = outcome === 'EXPIRED' ? expiresAt : new Date(at.getTime() + minutes(between(2, 9)));
      const counter = ev.origin === 'COUNTER';
      const resolver = ev.by;
      const base = {
        code, customerId: c.id, rewardId: reward.id, rewardName: reward.name, points: reward.points,
        origin: ev.origin, createdAt: at, expiresAt, status: outcome,
        confirmedByAccountId: counter ? ev.by.accountId : null,
        confirmedByName: counter ? ev.by.name : null,
        resolvedAt,
      } as const;

      if (outcome === 'USED') {
        // Con el uso recién se descuentan los puntos y el stock; ahí se vuelve a validar el saldo
        await expireDue(c, resolvedAt);
        if (c.balance < reward.points) { counters.skipped.push(`canje usado de ${c.firstName} ${c.lastName}`); codes.delete(code); continue; }
        const balanceBefore = c.balance;
        await consumeFifo(c, reward.points);
        c.balance -= reward.points;
        const row = await tx.redemption.create({
          data: { ...base, resolvedByAccountId: resolver.accountId, resolvedByName: resolver.name, balanceBefore, balanceAfter: c.balance },
        });
        await tx.pointsMovement.create({
          data: { customerId: c.id, redemptionId: row.id, type: 'REDEMPTION', points: -reward.points, balanceAfter: c.balance, performedByAccountId: resolver.accountId, performedByName: resolver.name, createdAt: resolvedAt },
        });
        reward.usedCount++;
        if (counter) await audit(redemptionConfirmedEntry(byEmployee(ev.by), snap(c), { code, rewardName: reward.name, points: reward.points }), at);
        await audit(redemptionUsedEntry(byEmployee(resolver), snap(c), { code, rewardName: reward.name, points: reward.points, balanceAfter: c.balance }), resolvedAt);
      } else if (outcome === 'EXPIRED') {
        await tx.redemption.create({ data: { ...base, resolvedByAccountId: null, resolvedByName: 'Sistema' } });
        if (counter) await audit(redemptionConfirmedEntry(byEmployee(ev.by), snap(c), { code, rewardName: reward.name, points: reward.points }), at);
        await audit(redemptionExpiredEntry(snap(c), { code, rewardName: reward.name }), resolvedAt);
        if (c === lucas) counters.redemptionCodes.push(`${code} (Lucas Ferreyra, ${reward.name}, vencido)`);
      } else if (outcome === 'REJECTED') {
        const reason = pick(['El cliente se retiró del local', 'La recompensa no estaba disponible ese día', 'Pedido duplicado']);
        await tx.redemption.create({ data: { ...base, resolvedByAccountId: resolver.accountId, resolvedByName: resolver.name, rejectionReason: reason } });
        if (counter) await audit(redemptionConfirmedEntry(byEmployee(ev.by), snap(c), { code, rewardName: reward.name, points: reward.points }), at);
        await audit(redemptionRejectedEntry(byEmployee(resolver), snap(c), { code, rewardName: reward.name, reason }), resolvedAt);
      } else {
        await tx.redemption.create({ data: { ...base, resolvedByAccountId: null, resolvedByName: null } });
        if (counter) await audit(redemptionConfirmedEntry(byEmployee(ev.by), snap(c), { code, rewardName: reward.name, points: reward.points }), at);
      }
      stats.redemptions[outcome]++;
    }
  }

  // Vencimiento diario hasta hoy, para todos
  for (const c of customers) await expireDue(c, NOW);

  // Estado final de cada cliente y de cada recompensa
  for (const c of customers.filter((x) => x.active)) {
    await tx.customerPoints.create({
      data: { customerId: c.id, balance: c.balance, debt: c.debt, lifetimePoints: c.lifetime, updatedAt: NOW },
    });
  }
  for (const r of rewards) await tx.reward.update({ where: { id: r.id }, data: { usedCount: r.usedCount } });

  // ----- Verificación y resumen --------------------------------------------------------------
  await verify(tx, stats, counters, { martina, lucas, joaquin, sofia, camila, nicolas });
}

async function verify(
  tx: Tx,
  stats: { consumptions: number; voids: number; adjustments: number; redemptions: Record<string, number> },
  counters: { skipped: string[]; redemptionCodes: string[] },
  who: Record<string, Cust>,
): Promise<void> {
  const q = <T>(sql: Prisma.Sql) => tx.$queryRaw<T[]>(sql);

  const balanceMismatch = await q<{ customer_id: number }>(Prisma.sql`
    SELECT cp.customer_id FROM customer_points cp
    LEFT JOIN (SELECT customer_id, SUM(remaining_points) AS s FROM points_lots WHERE status = 'ACTIVE' GROUP BY customer_id) l
      ON l.customer_id = cp.customer_id
    WHERE cp.balance <> COALESCE(l.s, 0) - cp.debt`);
  const lifetimeMismatch = await q<{ customer_id: number }>(Prisma.sql`
    SELECT cp.customer_id FROM customer_points cp
    LEFT JOIN (SELECT customer_id, SUM(points) AS s FROM points_movements
               WHERE type IN ('CONSUMPTION_CREDIT','VOID_REVERSAL') GROUP BY customer_id) m
      ON m.customer_id = cp.customer_id
    WHERE cp.lifetime_points <> COALESCE(m.s, 0)`);
  const ledgerMismatch = await q<{ customer_id: number }>(Prisma.sql`
    SELECT cp.customer_id FROM customer_points cp
    LEFT JOIN (SELECT customer_id, SUM(points) AS s FROM points_movements GROUP BY customer_id) m
      ON m.customer_id = cp.customer_id
    WHERE cp.balance <> COALESCE(m.s, 0)`);
  const usedMismatch = await q<{ id: number }>(Prisma.sql`
    SELECT r.id FROM rewards r
    WHERE r.used_count <> (SELECT COUNT(*) FROM redemptions x WHERE x.reward_id = r.id AND x.status = 'USED')`);
  const negatives = await q<{ name: string; balance: number }>(Prisma.sql`
    SELECT c.first_name || ' ' || c.last_name AS name, cp.balance
    FROM customer_points cp JOIN customers c ON c.id = cp.customer_id WHERE cp.balance < 0`);
  const confirmedOpen = await q<{ n: bigint }>(Prisma.sql`SELECT COUNT(*) AS n FROM redemptions WHERE status = 'CONFIRMED'`);

  const counts = await q<{ t: string; n: bigint }>(Prisma.sql`
    SELECT 'clientes' AS t, COUNT(*) AS n FROM customers UNION ALL
    SELECT 'consumos', COUNT(*) FROM consumptions UNION ALL
    SELECT 'lotes', COUNT(*) FROM points_lots UNION ALL
    SELECT 'movimientos de puntos', COUNT(*) FROM points_movements UNION ALL
    SELECT 'recompensas', COUNT(*) FROM rewards UNION ALL
    SELECT 'canjes', COUNT(*) FROM redemptions UNION ALL
    SELECT 'auditoría', COUNT(*) FROM audit_logs`);

  console.log('\n=== Resumen ===');
  for (const row of counts) console.log(`  ${row.t}: ${row.n}`);
  console.log(`  anulaciones: ${stats.voids} · ajustes: ${stats.adjustments}`);
  console.log(`  canjes: ${JSON.stringify(stats.redemptions)}`);
  if (counters.skipped.length > 0) console.log(`  omitidos por no cumplir reglas (${counters.skipped.length}): ${counters.skipped.slice(0, 6).join('; ')}…`);

  console.log('\n=== Personajes ===');
  for (const [key, c] of Object.entries(who)) {
    const level = c.lifetime >= GOLD ? 'Oro' : c.lifetime >= SILVER ? 'Plata' : 'Bronce';
    console.log(`  ${key}: ${c.firstName} ${c.lastName} · DNI ${c.dni} · saldo ${fmt(c.balance)} · acumulados ${fmt(c.lifetime)} · ${level}`);
  }
  for (const code of counters.redemptionCodes) console.log(`  código vencido de demo: ${code}`);

  console.log('\n=== Verificaciones ===');
  const checks: [string, number][] = [
    ['saldo ≠ Σ lotes activos − deuda', balanceMismatch.length],
    ['acumulados ≠ Σ créditos − anulaciones', lifetimeMismatch.length],
    ['saldo ≠ Σ movimientos', ledgerMismatch.length],
    ['usedCount ≠ canjes USED', usedMismatch.length],
    ['canjes CONFIRMED vigentes', Number(confirmedOpen[0].n)],
  ];
  let failed = false;
  for (const [label, n] of checks) {
    console.log(`  ${n === 0 ? 'OK ' : 'MAL'} ${label}: ${n}`);
    if (n !== 0) failed = true;
  }
  const onlyJoaquin = negatives.length === 1 && negatives[0].name.startsWith('Joaquín') && negatives[0].balance === -120;
  console.log(`  ${onlyJoaquin ? 'OK ' : 'MAL'} único saldo negativo = Joaquín (−120): ${negatives.map((n) => `${n.name} ${n.balance}`).join(', ') || 'ninguno'}`);
  if (!onlyJoaquin) failed = true;
  const expect = (label: string, ok: boolean) => { console.log(`  ${ok ? 'OK ' : 'MAL'} ${label}`); if (!ok) failed = true; };
  expect('Martina: saldo 0 y sin consumos', who.martina.balance === 0 && who.martina.cons.length === 0);
  expect('Lucas: saldo 480 (Plata)', who.lucas.balance === 480 && who.lucas.lifetime === 480);
  expect('Sofía: Oro con 1.250 acumulados y saldo ≥ 600', who.sofia.lifetime === 1250 && who.sofia.balance >= 600);
  expect('Camila: 280 acumulados', who.camila.lifetime === 280);
  if (failed) throw new Error('Falló una verificación: se deshace todo (no queda nada cargado).');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
