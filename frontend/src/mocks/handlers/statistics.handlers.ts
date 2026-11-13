// Este archivo simula el backend de las estadísticas (contrato S5 §3.9) para probar la
// pantalla sin levantar la API: la forma de cada respuesta, los cuatro 400 del filtro `month`
// y el 403 para quien no es Administrador. Los números son datos de ejemplo propios (no los
// del prototipo): cambian según el mes, y los de clientes según el mínimo de frecuente.
import { http, HttpResponse } from 'msw';
import { API_URL } from '@/shared/api/http';
import type {
  ClientsStatistics,
  ConsumptionsStatistics,
  PointsStatistics,
  PointsTotals,
  ProgramStatistics,
} from '@/features/statistics';
import { getFrequentMinConsumptions } from './points.handlers';

const BASE = `${API_URL}/estadisticas`;

const pad = (n: number) => String(n).padStart(2, '0');

// Mes de hoy en hora de Argentina, como 'YYYY-MM'.
function currentMonth(): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}`;
}

const respondError = (status: number, error: string, message: string, request: Request) => {
  const { pathname, search } = new URL(request.url);
  return HttpResponse.json(
    { statusCode: status, error, message, path: pathname + search, timestamp: new Date().toISOString() },
    { status },
  );
};

const isAdminRequest = (request: Request) =>
  /^Bearer mock-access-token-1-/.test(request.headers.get('authorization') ?? '');

// Valida `month` con los mensajes del contrato §3.9. Devuelve el 400 o null si está bien.
function checkMonth(request: Request): Response | null {
  const month = new URL(request.url).searchParams.get('month');
  const bad = (message: string) => respondError(400, 'Bad Request', message, request);

  if (!month) return bad('Elegí un mes.');
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return bad('El mes tiene que tener el formato AAAA-MM.');

  const now = currentMonth();
  if (month > now) return bad('No se puede elegir un mes que todavía no empezó.');
  const lastYear = Number(now.slice(0, 4)) - 1;
  if (Number(match[1]) < lastYear) return bad(`Elegí un mes desde enero de ${lastYear}.`);
  return null;
}

// Número estable por mes, para que cada mes tenga datos distintos pero repetibles.
const seedOf = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));

function monthsBack(month: string, back: number): string {
  const total = seedOf(month) - 1 - back;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

function clients(month: string): ClientsStatistics {
  const min = getFrequentMinConsumptions();
  // Con un mínimo más alto hay menos frecuentes.
  const factor = 3 / (min + 0.01);
  const seed = seedOf(month);
  const active = 150 + ((seed * 7) % 60);
  const newOf = (m: string) => 12 + ((seedOf(m) * 5) % 14);
  return {
    active,
    new: newOf(month),
    frequent: Math.min(active, Math.round(active * 0.38 * Math.min(1.6, factor))),
    frequentMinConsumptions: min,
    last6Months: Array.from({ length: 6 }, (_, i) => {
      const m = monthsBack(month, 5 - i);
      const nuevos = newOf(m);
      const ratio = Math.min(1, 0.12 + (((seedOf(m) * 37) % 17) / 100) * (5 / (min + 2)));
      return { month: m, new: nuevos, newFrequent: Math.min(nuevos, Math.round(nuevos * ratio)) };
    }),
  };
}

function consumptions(month: string): ConsumptionsStatistics {
  const seed = seedOf(month);
  const count = 400 + ((seed * 13) % 220);
  const weights = [10, 12, 13, 15, 18, 20, 12];
  const slots = [
    ['00:00', '08:00', 6],
    ['08:00', '12:00', 24],
    ['12:00', '16:00', 30],
    ['16:00', '20:00', 28],
    ['20:00', '24:00', 12],
  ] as const;
  const ticket = 15_000 + (seed % 5) * 400;
  return {
    total: { count, amount: count * ticket },
    byWeekday: weights.map((w, i) => {
      const c = Math.round((count * w) / 100);
      return { weekday: i + 1, count: c, amount: c * ticket };
    }),
    byTimeSlot: slots.map(([from, to, w]) => {
      const c = Math.round((count * w) / 100);
      return { from, to, count: c, amount: c * ticket };
    }),
  };
}

function pointsTotals(month: string): PointsTotals {
  const seed = seedOf(month);
  const awarded = 90_000 + ((seed * 311) % 40_000);
  return {
    awarded,
    bonus: 500 + ((seed * 17) % 300),
    missionRewards: 3_000 + ((seed * 29) % 1_500),
    birthdayBonus: 400 + ((seed * 3) % 300),
    redeemed: Math.round(awarded * 0.38),
    expired: 6_000 + ((seed * 41) % 2_000),
    voided: 2_000 + ((seed * 7) % 800),
  };
}

function points(month: string): PointsStatistics {
  return { ...pointsTotals(month), previousMonth: pointsTotals(monthsBack(month, 1)) };
}

function program(month: string): ProgramStatistics {
  const seed = seedOf(month);
  const isCurrent = month === currentMonth();
  const assigned = 180 + ((seed * 11) % 70);
  const completed = Math.round(assigned * 0.14);
  const claimed = Math.round(assigned * 0.27);
  // En progreso solo en el mes actual; en uno cerrado ya vencieron (§3.9.4).
  const inProgress = isCurrent ? assigned - completed - claimed : 0;
  const redemptionsUsed = 120 + ((seed * 3) % 60);
  return {
    levels: [
      { level: 'BRONZE', customers: 120 },
      { level: 'SILVER', customers: 50 },
      { level: 'GOLD', customers: 14 },
    ],
    levelUps: 8 + (seed % 12),
    missions: {
      assigned,
      inProgress,
      completed,
      claimed,
      expired: assigned - inProgress - completed - claimed,
    },
    // Hasta 10 recompensas, de mayor a menor. Su suma es menor que `redemptionsUsed` (hay más
    // recompensas con canjes que las 10 que se listan), así el % de cada una sale del total real.
    topRewards: [
      ['Café + medialuna', 0.2],
      ['Porción de torta', 0.15],
      ['Jugo de naranja exprimido natural con hielo', 0.12],
      ['Tostado de jamón y queso', 0.1],
      ['Licuado de frutilla', 0.08],
      ['Medialuna extra', 0.06],
      ['Alfajor de maicena', 0.05],
      ['Café de especialidad', 0.04],
      ['Brownie', 0.03],
      ['Agua saborizada', 0.02],
    ].map(([name, share], index) => ({
      id: index + 1,
      name: name as string,
      used: Math.round(redemptionsUsed * (share as number)),
    })),
    redemptionsUsed,
  };
}

// Mismas reglas de acceso y de `month` en los cuatro endpoints.
const route = (path: string, build: (month: string) => object) =>
  http.get(`${BASE}/${path}`, ({ request }) => {
    if (!isAdminRequest(request)) return respondError(403, 'Forbidden', 'Forbidden resource', request);
    const invalid = checkMonth(request);
    if (invalid) return invalid;
    return HttpResponse.json(build(new URL(request.url).searchParams.get('month') as string));
  });

export const statisticsHandlers = [
  route('clientes', clients),
  route('consumos', consumptions),
  route('puntos', points),
  route('programa', program),
];
