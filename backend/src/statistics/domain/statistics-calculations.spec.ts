import {
  effectivenessRate,
  fillConversionMonths,
  fillTimeSlots,
  fillWeekdays,
  missionTotals,
  percentage,
  totalAwarded,
  variation,
} from './statistics-calculations.js';
import { timeSlotIndexOfHour } from './time-slots.js';

describe('timeSlotIndexOfHour — las cinco franjas (S5-22)', () => {
  it.each([
    [0, 0],
    [7, 0],
    [8, 1],
    [11, 1],
    [12, 2],
    [15, 2],
    [16, 3],
    [19, 3],
    [20, 4],
    [23, 4],
  ])('hora %d → franja %d', (hour, slot) => {
    expect(timeSlotIndexOfHour(hour)).toBe(slot);
  });
});

describe('fillWeekdays / fillTimeSlots — siempre los 7 días y las 5 franjas', () => {
  it('rellena con 0 lo que no tiene consumos', () => {
    const days = fillWeekdays([{ weekday: 3, count: 2, amount: 500 }]);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days[2]).toEqual({ weekday: 3, count: 2, amount: 500 });
    expect(days[0]).toEqual({ weekday: 1, count: 0, amount: 0 });
  });

  it('las franjas salen con from/to en orden', () => {
    const slots = fillTimeSlots([{ slot: 1, count: 145, amount: 2340408 }]);
    expect(slots.map((s) => `${s.from}-${s.to}`)).toEqual([
      '00:00-08:00',
      '08:00-12:00',
      '12:00-16:00',
      '16:00-20:00',
      '20:00-24:00',
    ]);
    expect(slots[1]).toEqual({ from: '08:00', to: '12:00', count: 145, amount: 2340408 });
    expect(slots[4]).toEqual({ from: '20:00', to: '24:00', count: 0, amount: 0 });
  });
});

describe('fillConversionMonths', () => {
  it('devuelve los meses pedidos, con 0 donde no hubo altas', () => {
    const rows = fillConversionMonths(['2026-09', '2026-10'], [{ month: '2026-10', new: 5, newFrequent: 2 }]);
    expect(rows).toEqual([
      { month: '2026-09', new: 0, newFrequent: 0 },
      { month: '2026-10', new: 5, newFrequent: 2 },
    ]);
  });
});

describe('cuentas de puntos y misiones (S5 §3.9.3, §3.9.4, §3.9.7)', () => {
  it('total acreditado = consumos + bonificación + misiones + cumpleaños', () => {
    expect(totalAwarded({ awarded: 119665, bonus: 690, missionRewards: 4020, birthdayBonus: 500 })).toBe(124875);
  });

  it('porcentaje con un decimal, sin total → 0', () => {
    expect(percentage(45473, 124875)).toBe(36.4);
    expect(percentage(1, 0)).toBe(0);
  });

  it('variación contra el mes anterior con un decimal; anterior 0 → null', () => {
    expect(variation(119665, 110310)).toBe(8.5);
    expect(variation(40, 50)).toBe(-20);
    expect(variation(10, 0)).toBeNull();
  });

  it('assigned es la suma de los cuatro estados y la tasa de efectividad = (completadas + reclamadas) ÷ asignadas', () => {
    const missions = missionTotals({ inProgress: 133, completed: 31, claimed: 62, expired: 0 });
    expect(missions).toEqual({ assigned: 226, inProgress: 133, completed: 31, claimed: 62, expired: 0 });
    expect(effectivenessRate(missions)).toBe(41.2);
    expect(effectivenessRate({ assigned: 0, completed: 0, claimed: 0 })).toBe(0);
  });
});
