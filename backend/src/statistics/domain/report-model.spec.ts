import { formatDateTime, formatMoney, formatNumber, formatPercent, formatSignedPercent, monthLabel, shortMonthLabel } from './report-format.js';
import { buildReportModel } from './report-model.js';
import { parseStatisticsMonth, previousMonthWindow } from './statistics-month.js';
import type { ConsumptionsStatistics, CustomersStatistics, PointsStatistics, ProgramStatistics } from './statistics-types.js';

// 14/11/2026 15:30 en Argentina
const NOW = new Date('2026-11-14T18:30:00.000Z');

const customers: CustomersStatistics = {
  active: 184,
  new: 23,
  frequent: 70,
  frequentMinConsumptions: 3,
  last6Months: [
    { month: '2026-06', new: 23, newFrequent: 4 },
    { month: '2026-07', new: 0, newFrequent: 0 },
    { month: '2026-08', new: 0, newFrequent: 0 },
    { month: '2026-09', new: 0, newFrequent: 0 },
    { month: '2026-10', new: 0, newFrequent: 0 },
    { month: '2026-11', new: 10, newFrequent: 5 },
  ],
};
const consumptions: ConsumptionsStatistics = {
  total: { count: 606, amount: 9751700 },
  byWeekday: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, count: weekday === 1 ? 78 : 0, amount: weekday === 1 ? 1261100 : 0 })),
  byTimeSlot: [
    { from: '00:00', to: '08:00', count: 0, amount: 0 },
    { from: '08:00', to: '12:00', count: 145, amount: 2340408.5 },
    { from: '12:00', to: '16:00', count: 0, amount: 0 },
    { from: '16:00', to: '20:00', count: 0, amount: 0 },
    { from: '20:00', to: '24:00', count: 0, amount: 0 },
  ],
};
const points: PointsStatistics = {
  awarded: 119665,
  bonus: 690,
  missionRewards: 4020,
  birthdayBonus: 500,
  redeemed: 45473,
  expired: 7180,
  voided: 2393,
  previousMonth: { awarded: 110310, bonus: 660, missionRewards: 3720, birthdayBonus: 500, redeemed: 40457, expired: 0, voided: 2816 },
};
const program: ProgramStatistics = {
  levels: [
    { level: 'BRONZE', customers: 120 },
    { level: 'SILVER', customers: 50 },
    { level: 'GOLD', customers: 14 },
  ],
  levelUps: 17,
  missions: { assigned: 226, inProgress: 133, completed: 31, claimed: 62, expired: 0 },
  topRewards: [{ id: 1, name: 'Café + medialuna', used: 72 }],
  redemptionsUsed: 148,
};

function build(monthValue: string, sections: ('CUSTOMERS' | 'CONSUMPTIONS' | 'POINTS' | 'PROGRAM')[]) {
  const month = parseStatisticsMonth(monthValue, NOW);
  return buildReportModel({
    month,
    previousMonthValue: previousMonthWindow(month, NOW).value,
    sections,
    data: { customers, consumptions, points, program },
    generatedAt: NOW,
  });
}

describe('formato argentino', () => {
  it('números, plata y porcentajes', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatMoney(9751700)).toBe('$ 9.751.700');
    expect(formatMoney(1550.5)).toBe('$ 1.550,5');
    expect(formatPercent(17.4)).toBe('17,4 %');
    expect(formatPercent(0)).toBe('0,0 %');
    expect(formatSignedPercent(8.5)).toBe('+8,5 %');
    expect(formatSignedPercent(-3.2)).toBe('-3,2 %');
  });

  it('meses y fechas, en hora de Argentina', () => {
    expect(monthLabel('2026-11')).toBe('Noviembre 2026');
    expect(shortMonthLabel('2026-06')).toBe('Jun 26');
    expect(formatDateTime(NOW)).toBe('14/11/2026 15:30');
  });
});

describe('buildReportModel — US-55 (§3.9.5)', () => {
  it('título, mes (con "mes en curso") y fecha de generación', () => {
    const model = build('2026-11', ['CUSTOMERS']);

    expect(model.title).toBe('Reporte Vitto Club');
    expect(model.periodLabel).toBe('Noviembre 2026 (mes en curso)');
    expect(model.generatedAt).toBe('14/11/2026 15:30');
    expect(build('2026-10', ['CUSTOMERS']).periodLabel).toBe('Octubre 2026');
  });

  it('solo las secciones pedidas, en el orden Clientes · Consumos · Puntos · Programa', () => {
    expect(build('2026-11', ['CUSTOMERS', 'POINTS']).sections.map((s) => s.title)).toEqual(['Clientes', 'Puntos']);
    expect(build('2026-11', ['CUSTOMERS', 'CONSUMPTIONS', 'POINTS', 'PROGRAM']).sections.map((s) => s.title)).toEqual([
      'Clientes',
      'Consumos',
      'Puntos',
      'Programa',
    ]);
  });

  it('Clientes: activos, nuevos, frecuentes con el mínimo, y la conversión de los 6 meses con su %', () => {
    const [section] = build('2026-11', ['CUSTOMERS']).sections;

    expect(section.blocks[0]).toEqual({
      type: 'rows',
      rows: [
        ['Clientes activos', '184'],
        ['Clientes nuevos', '23'],
        ['Frecuentes (al menos 3 consumos)', '70'],
      ],
    });
    const table = section.blocks.find((block) => block.type === 'table');
    expect(table).toMatchObject({
      headers: ['Mes', 'Nuevos', 'Llegaron a 3 consumos o más', '% que llegaron'],
    });
    expect(table && 'rows' in table && table.rows).toEqual([
      ['Jun 26', '23', '4', '17,4 %'],
      ['Jul 26', '0', '0', '-'],
      ['Ago 26', '0', '0', '-'],
      ['Sep 26', '0', '0', '-'],
      ['Oct 26', '0', '0', '-'],
      ['Nov 26', '10', '5', '50,0 %'],
    ]);
  });

  it('Consumos: totales, los 7 días y las 5 franjas', () => {
    const [section] = build('2026-11', ['CONSUMPTIONS']).sections;
    const tables = section.blocks.filter((block) => block.type === 'table');

    expect(section.blocks[0]).toEqual({
      type: 'rows',
      rows: [
        ['Consumos', '606'],
        ['Monto total', '$ 9.751.700'],
      ],
    });
    expect(tables[0] && 'rows' in tables[0] && tables[0].rows.map((row) => row[0])).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
    expect(tables[1] && 'rows' in tables[1] && tables[1].rows[1]).toEqual(['08:00 a 12:00', '145', '$ 2.340.408,5']);
  });

  it('Puntos: variación contra el mes anterior ("Sin datos" si dio 0), origen y destino', () => {
    const [section] = build('2026-11', ['POINTS']).sections;
    const tables = section.blocks.filter((block) => block.type === 'table');
    const rows = (index: number) => (tables[index] && 'rows' in tables[index] ? tables[index].rows : []);

    // acreditados = 119665 + 690 + 4020 + 500 = 124875; anterior = 110310 + 660 + 3720 + 500 = 115190
    expect(rows(0)).toEqual([
      ['Acreditados', '124.875', '115.190', '+8,4 %'],
      ['Canjeados', '45.473', '40.457', '+12,4 %'],
      ['Vencidos', '7.180', '0', 'Sin datos de octubre.'],
      ['Anulados', '2.393', '2.816', '-15,0 %'],
    ]);
    expect(rows(1)).toEqual([
      ['Consumos', '119.665', '95,8 %'],
      ['Bonificación', '690', '0,6 %'],
      ['Misiones', '4.020', '3,2 %'],
      ['Cumpleaños', '500', '0,4 %'],
      ['Total acreditado', '124.875', '100,0 %'],
    ]);
    // saldo neto = 124875 - 45473 - 7180 - 2393 = 69829
    expect(rows(2)).toEqual([
      ['Saldo neto', '+69.829', '55,9 %'],
      ['Canjeados', '45.473', '36,4 %'],
      ['Vencidos', '7.180', '5,7 %'],
      ['Anulados', '2.393', '1,9 %'],
    ]);
    expect(section.blocks.some((block) => block.type === 'subtitle' && block.text === 'De los 124.875 acreditados…')).toBe(true);
  });

  it('Programa: niveles, subieron de nivel, misiones (En progreso solo en el mes en curso), efectividad, corte y recompensas', () => {
    const current = build('2026-11', ['PROGRAM']).sections[0];
    const closed = build('2026-10', ['PROGRAM']).sections[0];
    const tablesOf = (section: typeof current) => section.blocks.filter((block) => block.type === 'table');
    const rowsOf = (section: typeof current, index: number) => {
      const table = tablesOf(section)[index];
      return table && 'rows' in table ? table.rows : [];
    };

    // 184 activos entre los tres niveles
    expect(rowsOf(current, 0)).toEqual([
      ['Bronce', '120', '65,2 %'],
      ['Plata', '50', '27,2 %'],
      ['Oro', '14', '7,6 %'],
    ]);
    expect(current.blocks).toContainEqual({ type: 'rows', rows: [['Subieron de nivel en el mes', '9,2 %']] });
    expect(current.blocks).toContainEqual({ type: 'note', text: '17 clientes pasaron a un nivel más alto, a cualquiera.' });

    expect(rowsOf(current, 1).map((row) => row[0])).toEqual(['En progreso', 'Completada', 'Reclamada', 'Vencida']);
    expect(rowsOf(closed, 1).map((row) => row[0])).toEqual(['Completada', 'Reclamada', 'Vencida']);
    expect(current.blocks).toContainEqual({
      type: 'rows',
      rows: [
        ['Tasa de efectividad', '41,2 %'],
        ['Corte', '14/11/2026'],
      ],
    });
    // mes cerrado: el corte es el último día del mes
    expect(closed.blocks).toContainEqual({
      type: 'rows',
      rows: [
        ['Tasa de efectividad', '41,2 %'],
        ['Corte', '31/10/2026'],
      ],
    });
    expect(rowsOf(current, 2)).toEqual([['1', 'Café + medialuna', '72', '48,6 %']]);
    expect(current.blocks.some((block) => block.type === 'subtitle' && block.text === 'Recompensas más canjeadas · 148 canjes usados')).toBe(true);
  });
});
