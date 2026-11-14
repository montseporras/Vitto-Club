// Este archivo tiene lo que necesita el reporte PDF (US-55, contrato S5 §3.9.5 y §3.9.7):
// las cuatro secciones con sus textos y el nombre de archivo de reserva.
import type { ReportSection } from '../types/statistics';

export interface ReportSectionInfo {
  value: ReportSection;
  label: string;
  description: string;
}

// En el orden del contrato: Clientes · Consumos · Puntos · Programa (es también el orden del PDF).
export const REPORT_SECTIONS: ReportSectionInfo[] = [
  {
    value: 'CUSTOMERS',
    label: 'Clientes',
    description: 'Activos, nuevos, frecuentes y conversión de los nuevos',
  },
  {
    value: 'CONSUMPTIONS',
    label: 'Consumos',
    description: 'Por día de la semana y por franja horaria',
  },
  {
    value: 'POINTS',
    label: 'Puntos',
    description: 'Variación contra el mes anterior, origen y destino de los puntos',
  },
  {
    value: 'PROGRAM',
    label: 'Programa',
    description: 'Clientes por nivel, misiones y recompensas',
  },
];

/** Las secciones elegidas, siempre en el orden del contrato y sin repetir. */
export const orderedSections = (selected: Set<ReportSection>): ReportSection[] =>
  REPORT_SECTIONS.map((section) => section.value).filter((value) => selected.has(value));

/**
 * 'YYYY-MM' → 'vitto-club-reporte-2026-11-01-2026-11-30.pdf'. Es el nombre que arma el backend
 * (§3.9.5); se usa solo si la respuesta no lo trae.
 */
export function reportFileName(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  // Día 0 del mes siguiente = último día de este mes
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `vitto-club-reporte-${month}-01-${month}-${pad(lastDay)}.pdf`;
}
