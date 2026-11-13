// Este archivo arma las porciones de las tortas y las cuentas de la pestaña Programa (contrato S5
// §3.9.4 y §3.9.7). Las únicas cuentas que hace la pantalla son los porcentajes, "Subieron de
// nivel" (levelUps ÷ activos) y la tasa de efectividad ((completed + claimed) ÷ assigned).
import { LEVELS } from '@/domain/levels';
import { percentOf } from './format';
import type { ProgramStatistics, StatisticsLevel } from '../types/statistics';

export interface PieSlice {
  key: string;
  label: string;
  count: number;
  color: string;
  /** Explicación debajo de la etiqueta (misiones). */
  help?: string;
}

// Colores de la paleta de la marca (S5-54).
const LEVEL_COLORS: Record<StatisticsLevel, string> = {
  BRONZE: '#ffa47e', // durazno
  SILVER: '#8a7468', // topo
  GOLD: '#d4ae3a', // mostaza
};

/** Porciones de "Clientes por nivel": Bronce, Plata y Oro. */
export const levelSlices = (levels: ProgramStatistics['levels']): PieSlice[] =>
  levels.map((entry) => ({
    key: entry.level,
    label: LEVELS[entry.level],
    count: entry.customers,
    color: LEVEL_COLORS[entry.level],
  }));

/**
 * Porciones de "Misiones asignadas". "En progreso" solo se muestra en el mes actual (S5-50): en un
 * mes cerrado ya vencieron o se reclamaron. "Vencida" no lleva explicación si no hay ninguna.
 */
export function missionSlices(
  missions: ProgramStatistics['missions'],
  isCurrentMonth: boolean,
): PieSlice[] {
  return [
    ...(isCurrentMonth
      ? [
          {
            key: 'inProgress',
            label: 'En progreso',
            count: missions.inProgress,
            color: '#1b7f8c', // turquesa
            help: 'El mes todavía no terminó.',
          },
        ]
      : []),
    {
      key: 'completed',
      label: 'Completada',
      count: missions.completed,
      color: '#d4ae3a', // mostaza
      help: 'Falta que el cliente la reclame o la misión no tiene recompensa.',
    },
    {
      key: 'claimed',
      label: 'Reclamada',
      count: missions.claimed,
      color: '#8b3f22', // rojizo
      help: 'Se acreditaron los puntos.',
    },
    {
      key: 'expired',
      label: 'Vencida',
      count: missions.expired,
      color: '#ffa47e', // durazno
      help: missions.expired > 0 ? 'No llegó al objetivo antes de fin de mes.' : undefined,
    },
  ];
}

/** Tasa de efectividad = (completadas sin reclamar + reclamadas) ÷ asignadas, en porcentaje. */
export const effectivenessRate = (missions: ProgramStatistics['missions']) =>
  percentOf(missions.completed + missions.claimed, missions.assigned);

/** Total de clientes activos que muestra la torta de niveles (la suma de sus porciones). */
export const sliceTotal = (slices: PieSlice[]) =>
  slices.reduce((sum, slice) => sum + slice.count, 0);
