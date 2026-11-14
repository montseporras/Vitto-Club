import type { ReportSection } from './report-sections.js';
import type { StatisticsMonth } from './statistics-month.js';
import {
  effectivenessRate,
  percentage,
  totalAwarded,
  variation,
} from './statistics-calculations.js';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatSignedNumber,
  formatSignedPercent,
  monthLabel,
  monthName,
  shortMonthLabel,
} from './report-format.js';
import type {
  ConsumptionsStatistics,
  CustomersStatistics,
  PointsStatistics,
  ProgramStatistics,
} from './statistics-types.js';

// S5 §3.9.5 (S5-49): lo que dice el PDF, con los mismos datos y rótulos que la pantalla (§3.9.7). El dibujo
// lo hace el renderizador; acá solo hay datos y textos, para poder probarlos.
export type ReportBlock =
  | { type: 'rows'; rows: [label: string, value: string][] }
  | { type: 'subtitle'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][]; widths: number[]; align: ('left' | 'right')[] }
  | { type: 'note'; text: string };

export type ReportSectionModel = { title: string; blocks: ReportBlock[] };

export type ReportModel = {
  title: string;
  periodLabel: string;
  generatedAt: string;
  sections: ReportSectionModel[];
};

// Solo se arman los datos de las secciones elegidas
export type ReportData = {
  customers?: CustomersStatistics;
  consumptions?: ConsumptionsStatistics;
  points?: PointsStatistics;
  program?: ProgramStatistics;
};

const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const LEVEL_NAMES = { BRONZE: 'Bronce', SILVER: 'Plata', GOLD: 'Oro' } as const;

const NO_VALUE = '-';

function customersSection(data: CustomersStatistics): ReportSectionModel {
  const min = data.frequentMinConsumptions;
  return {
    title: 'Clientes',
    blocks: [
      {
        type: 'rows',
        rows: [
          ['Clientes activos', formatNumber(data.active)],
          ['Clientes nuevos', formatNumber(data.new)],
          [`Frecuentes (al menos ${min} consumos)`, formatNumber(data.frequent)],
        ],
      },
      { type: 'subtitle', text: 'Conversión de clientes nuevos' },
      {
        type: 'table',
        headers: ['Mes', 'Nuevos', `Llegaron a ${min} consumos o más`, '% que llegaron'],
        rows: data.last6Months.map((row) => [
          shortMonthLabel(row.month),
          formatNumber(row.new),
          formatNumber(row.newFrequent),
          row.new === 0 ? NO_VALUE : formatPercent(percentage(row.newFrequent, row.new)),
        ]),
        widths: [0.2, 0.2, 0.36, 0.24],
        align: ['left', 'right', 'right', 'right'],
      },
      {
        type: 'note',
        text: 'Clientes dados de alta en el mes que llegaron al mínimo de frecuente en ese mismo mes. El mínimo se cambia en Configuración → Puntos.',
      },
    ],
  };
}

function consumptionsSection(data: ConsumptionsStatistics): ReportSectionModel {
  return {
    title: 'Consumos',
    blocks: [
      {
        type: 'rows',
        rows: [
          ['Consumos', formatNumber(data.total.count)],
          ['Monto total', formatMoney(data.total.amount)],
        ],
      },
      { type: 'subtitle', text: 'Por día de la semana' },
      {
        type: 'table',
        headers: ['Día', 'Consumos', 'Monto'],
        rows: data.byWeekday.map((row) => [
          WEEKDAY_NAMES[row.weekday - 1],
          formatNumber(row.count),
          formatMoney(row.amount),
        ]),
        widths: [0.4, 0.25, 0.35],
        align: ['left', 'right', 'right'],
      },
      { type: 'subtitle', text: 'Por franja horaria' },
      {
        type: 'table',
        headers: ['Franja', 'Consumos', 'Monto'],
        rows: data.byTimeSlot.map((row) => [`${row.from} a ${row.to}`, formatNumber(row.count), formatMoney(row.amount)]),
        widths: [0.4, 0.25, 0.35],
        align: ['left', 'right', 'right'],
      },
    ],
  };
}

// {mes} de "Sin datos de {mes}." es el mes con el que se compara
function pointsSection(data: PointsStatistics, previousMonthValue: string, month: StatisticsMonth): ReportSectionModel {
  const previous = data.previousMonth;
  const awarded = totalAwarded(data);
  const previousAwarded = totalAwarded(previous);
  const compared = monthName(previousMonthValue);

  const variationText = (current: number, before: number): string => {
    const value = variation(current, before);
    return value === null ? `Sin datos de ${compared}.` : formatSignedPercent(value);
  };
  const comparison: [string, number, number][] = [
    ['Acreditados', awarded, previousAwarded],
    ['Canjeados', data.redeemed, previous.redeemed],
    ['Vencidos', data.expired, previous.expired],
    ['Anulados', data.voided, previous.voided],
  ];

  const origin: [string, number][] = [
    ['Consumos', data.awarded],
    ['Bonificación', data.bonus],
    ['Misiones', data.missionRewards],
    ['Cumpleaños', data.birthdayBonus],
  ];

  const net = awarded - data.redeemed - data.expired - data.voided;
  const destination: [string, string, number][] = [
    ['Saldo neto', formatSignedNumber(net), net],
    ['Canjeados', formatNumber(data.redeemed), data.redeemed],
    ['Vencidos', formatNumber(data.expired), data.expired],
    ['Anulados', formatNumber(data.voided), data.voided],
  ];

  return {
    title: 'Puntos',
    blocks: [
      { type: 'subtitle', text: `Variación contra ${monthLabel(previousMonthValue)}` },
      {
        type: 'table',
        headers: ['Concepto', monthLabel(month.value), monthLabel(previousMonthValue), 'Variación'],
        rows: comparison.map(([label, current, before]) => [
          label,
          formatNumber(current),
          formatNumber(before),
          variationText(current, before),
        ]),
        widths: [0.25, 0.22, 0.23, 0.3],
        align: ['left', 'right', 'right', 'right'],
      },
      { type: 'subtitle', text: 'De dónde salen los puntos' },
      {
        type: 'table',
        headers: ['Origen', 'Puntos', '% del total'],
        rows: [
          ...origin.map(([label, value]) => [label, formatNumber(value), formatPercent(percentage(value, awarded))]),
          ['Total acreditado', formatNumber(awarded), awarded === 0 ? formatPercent(0) : formatPercent(100)],
        ],
        widths: [0.4, 0.3, 0.3],
        align: ['left', 'right', 'right'],
      },
      { type: 'subtitle', text: `De los ${formatNumber(awarded)} acreditados…` },
      {
        type: 'table',
        headers: ['Destino', 'Puntos', '% de lo acreditado'],
        rows: destination.map(([label, text, value]) => [label, text, formatPercent(percentage(value, awarded))]),
        widths: [0.4, 0.3, 0.3],
        align: ['left', 'right', 'right'],
      },
    ],
  };
}

function programSection(data: ProgramStatistics, month: StatisticsMonth): ReportSectionModel {
  const customers = data.levels.reduce((sum, row) => sum + row.customers, 0);
  const missions = data.missions;
  const missionRows: [string, number][] = [
    // En progreso solo se muestra en el mes en curso (S5-50)
    ...(month.isCurrent ? ([['En progreso', missions.inProgress]] as [string, number][]) : []),
    ['Completada', missions.completed],
    ['Reclamada', missions.claimed],
    ['Vencida', missions.expired],
  ];
  const cutoff = month.isCurrent ? month.cutoff : new Date(month.endExclusive.getTime() - 1);

  return {
    title: 'Programa',
    blocks: [
      { type: 'subtitle', text: 'Clientes por nivel' },
      {
        type: 'table',
        headers: ['Nivel', 'Clientes', '%'],
        rows: data.levels.map((row) => [
          LEVEL_NAMES[row.level],
          formatNumber(row.customers),
          formatPercent(percentage(row.customers, customers)),
        ]),
        widths: [0.4, 0.3, 0.3],
        align: ['left', 'right', 'right'],
      },
      {
        type: 'rows',
        rows: [['Subieron de nivel en el mes', formatPercent(percentage(data.levelUps, customers))]],
      },
      {
        type: 'note',
        text: `${formatNumber(data.levelUps)} clientes pasaron a un nivel más alto, a cualquiera.`,
      },
      { type: 'subtitle', text: 'Misiones asignadas' },
      {
        type: 'table',
        headers: ['Estado', 'Misiones', '%'],
        rows: missionRows.map(([label, value]) => [
          label,
          formatNumber(value),
          formatPercent(percentage(value, missions.assigned)),
        ]),
        widths: [0.4, 0.3, 0.3],
        align: ['left', 'right', 'right'],
      },
      {
        type: 'rows',
        rows: [
          ['Tasa de efectividad', formatPercent(effectivenessRate(missions))],
          ['Corte', formatDate(cutoff)],
        ],
      },
      { type: 'subtitle', text: `Recompensas más canjeadas · ${formatNumber(data.redemptionsUsed)} canjes usados` },
      {
        type: 'table',
        headers: ['Puesto', 'Recompensa', 'Canjes', '%'],
        rows:
          data.topRewards.length === 0
            ? [[NO_VALUE, NO_VALUE, NO_VALUE, NO_VALUE]]
            : data.topRewards.map((reward, index) => [
                String(index + 1),
                reward.name,
                formatNumber(reward.used),
                formatPercent(percentage(reward.used, data.redemptionsUsed)),
              ]),
        widths: [0.12, 0.56, 0.14, 0.18],
        align: ['left', 'left', 'right', 'right'],
      },
    ],
  };
}

// Arma el modelo con las secciones elegidas, siempre en el orden Clientes · Consumos · Puntos · Programa
export function buildReportModel(args: {
  month: StatisticsMonth;
  previousMonthValue: string;
  sections: ReportSection[];
  data: ReportData;
  generatedAt: Date;
}): ReportModel {
  const { month, previousMonthValue, sections, data, generatedAt } = args;
  const builders: Record<ReportSection, () => ReportSectionModel> = {
    CUSTOMERS: () => customersSection(data.customers as CustomersStatistics),
    CONSUMPTIONS: () => consumptionsSection(data.consumptions as ConsumptionsStatistics),
    POINTS: () => pointsSection(data.points as PointsStatistics, previousMonthValue, month),
    PROGRAM: () => programSection(data.program as ProgramStatistics, month),
  };
  return {
    title: 'Reporte Vitto Club',
    periodLabel: `${monthLabel(month.value)}${month.isCurrent ? ' (mes en curso)' : ''}`,
    generatedAt: formatDateTime(generatedAt),
    sections: sections.map((section) => builders[section]()),
  };
}
