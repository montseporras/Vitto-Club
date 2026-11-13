// Este archivo tiene las cuentas de la pestaña Puntos (contrato S5 §3.9.3 y §3.9.7). Son las únicas
// que hace la pantalla: el total de acreditados, el saldo neto, el total de "Puntos extra" y la
// variación contra el mes anterior. Los totales del mes anterior los manda el backend
// (`previousMonth`).
import { formatOneDecimal, NBSP } from './format';
import type { PointsTotals } from '../types/statistics';

/** Acreditados = consumos + bonificación + misiones + cumpleaños. */
export const creditedTotal = (t: PointsTotals) =>
  t.awarded + t.bonus + t.missionRewards + t.birthdayBonus;

/** Puntos extra = bonificación + misiones + cumpleaños. */
export const extrasTotal = (t: PointsTotals) => t.bonus + t.missionRewards + t.birthdayBonus;

/** Saldo neto = acreditados − canjeados − vencidos − anulados (puede ser negativo). */
export const netBalance = (t: PointsTotals) =>
  creditedTotal(t) - t.redeemed - t.expired - t.voided;

export interface ExtraRow {
  key: 'missionRewards' | 'bonus' | 'birthdayBonus';
  label: string;
  points: number;
  /** Misiones y Cumpleaños no suman al nivel (S5-9). */
  noLevel: boolean;
}

/** Las tres filas de "Puntos extra", de mayor a menor (con empate: Misiones, Bonificación, Cumpleaños). */
export function extraRows(t: PointsTotals): ExtraRow[] {
  const rows: ExtraRow[] = [
    { key: 'missionRewards', label: 'Misiones', points: t.missionRewards, noLevel: true },
    { key: 'bonus', label: 'Bonificación por primer consumo', points: t.bonus, noLevel: false },
    { key: 'birthdayBonus', label: 'Cumpleaños', points: t.birthdayBonus, noLevel: true },
  ];
  // sort es estable: con valores iguales queda el orden de arriba
  return rows.sort((a, b) => b.points - a.points);
}

/**
 * Variación contra el mes anterior: "▲ 8,5 % vs. oct." o "▼ …", con un decimal. Si el mes
 * anterior dio 0, "Sin datos de oct." (contrato §3.9.7). `previousName` ya viene en 3 letras.
 */
export function variationText(current: number, previous: number, previousName: string): string {
  if (previous === 0) return `Sin datos de ${previousName}.`;
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '▲' : '▼'} ${formatOneDecimal(Math.abs(change))}${NBSP}% vs. ${previousName}.`;
}
