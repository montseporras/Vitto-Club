import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma, EmployeeRole, DocumentType, AccountRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

// El seed corre fuera de Nest, así que no puede usar el adaptador de hash de `auth`:
// es la única excepción a "nadie fuera de auth hashea contraseñas". Usa la misma
// librería (bcryptjs), por lo que el login verifica estos hashes sin cambios.
// Las reglas de abajo duplican a propósito las de auth/domain (la fuente de verdad).
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const DEFAULT_BCRYPT_COST = 10;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  }
  return value;
}

// La contraseña no se recorta: se usa tal cual está en la variable.
function passwordEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  }
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    throw new Error(`${name} must have between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`);
  }
  return value;
}

function bcryptCost(): number {
  const raw = process.env.BCRYPT_COST;
  if (!raw) return DEFAULT_BCRYPT_COST;
  const cost = Number(raw);
  if (!Number.isInteger(cost) || cost < 4 || cost > 15) {
    throw new Error('BCRYPT_COST must be an integer between 4 and 15');
  }
  return cost;
}

type AccountOwner = { employeeId: number } | { customerId: number };

// El seed solo crea lo que falta: si el dueño ya tiene cuenta, no se toca
// (ni contraseña, ni rol, ni estado).
async function ensureAccount(
  tx: Prisma.TransactionClient,
  owner: AccountOwner,
  data: { identifier: string; passwordHash: string; role: AccountRole },
): Promise<void> {
  const existing = await tx.account.findUnique({ where: owner });
  if (existing) return;
  await tx.account.create({ data: { ...data, ...owner } });
}

// Administrador inicial: se crea siempre, también en producción.
async function seedAdmin(cost: number): Promise<void> {
  // El empleado inicia sesión con su email: es el identificador de la cuenta.
  const email = requiredEnv('SEED_ADMIN_EMAIL').toLowerCase();

  const password = passwordEnv('SEED_ADMIN_PASSWORD');
  if (password.toLowerCase() === email) {
    throw new Error('SEED_ADMIN_PASSWORD cannot be the same as SEED_ADMIN_EMAIL');
  }

  const firstName = requiredEnv('SEED_ADMIN_FIRST_NAME');
  const lastName = requiredEnv('SEED_ADMIN_LAST_NAME');
  const phone = requiredEnv('SEED_ADMIN_PHONE');

  const passwordHash = await bcrypt.hash(password, cost);

  // Empleado y cuenta en la misma transacción: nunca queda un admin sin cuenta.
  await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.upsert({
      where: { email },
      update: {},
      create: { firstName, lastName, phone, email, role: EmployeeRole.ADMIN },
    });

    // El rol sale del empleado (fuente de verdad), no se escribe fijo.
    await ensureAccount(tx, { employeeId: employee.id }, { identifier: employee.email, passwordHash, role: employee.role });
  });
}

// Datos de prueba: solo desarrollo.
async function seedDemoData(cost: number): Promise<void> {
  const passwordHash = await bcrypt.hash(passwordEnv('SEED_DEMO_PASSWORD'), cost);

  const employees = [
    { firstName: 'Ana',   lastName: 'Gómez',    phone: '3510000001', email: 'ana.gomez@vitto.club',      role: EmployeeRole.ADMIN },
    { firstName: 'Bruno', lastName: 'Pérez',    phone: '3510000002', email: 'bruno.perez@vitto.club',    role: EmployeeRole.CASHIER },
    { firstName: 'Carla', lastName: 'Martínez', phone: '3510000003', email: 'carla.martinez@vitto.club', role: EmployeeRole.CASHIER },
  ];

  const customers = [
    {
      firstName: 'Lucía', lastName: 'Fernández',
      documentType: DocumentType.DNI, documentNumber: '40123456',
      phone: '3511111111', email: 'lucia@example.com',
      dateOfBirth: new Date('1998-05-14'),
    },
    {
      firstName: 'Martín', lastName: 'Suárez',
      documentType: DocumentType.DNI, documentNumber: '38987654',
      phone: '3512222222', email: 'martin@example.com',
    },
  ];

  await prisma.$transaction(async (tx) => {
    for (const data of employees) {
      await tx.employee.upsert({ where: { email: data.email }, update: {}, create: data });
    }

    for (const data of customers) {
      await tx.customer.upsert({
        where: {
          unique_document: { documentType: data.documentType, documentNumber: data.documentNumber },
        },
        update: {},
        create: data,
      });
    }

    // Cuentas de prueba para el login por rol: un cajero y un cliente.
    // Carla y Martín quedan sin cuenta a propósito (caso "sin cuenta").
    const bruno = await tx.employee.findUniqueOrThrow({ where: { email: 'bruno.perez@vitto.club' } });
    await ensureAccount(tx, { employeeId: bruno.id }, { identifier: bruno.email, passwordHash, role: bruno.role });

    const lucia = await tx.customer.findUniqueOrThrow({
      where: { unique_document: { documentType: DocumentType.DNI, documentNumber: '40123456' } },
    });
    await ensureAccount(tx, { customerId: lucia.id }, { identifier: lucia.documentNumber, passwordHash, role: AccountRole.CUSTOMER });
  });
}

async function main() {
  const demo = process.env.SEED_DEMO_DATA === 'true';

  // Se valida antes de crear nada.
  if (demo && process.env.NODE_ENV === 'production') {
    throw new Error('SEED_DEMO_DATA=true is not allowed when NODE_ENV=production');
  }

  const cost = bcryptCost();

  await seedAdmin(cost);
  console.log('Admin ready.');

  if (demo) {
    await seedDemoData(cost);
    console.log('Demo data ready.');
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
