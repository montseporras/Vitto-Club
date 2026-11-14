import { StatisticsInputError } from './errors/statistics-input.error.js';

// S5 §3.9.5 (S5-49): las secciones del reporte PDF, en el orden en que salen en el documento
export const REPORT_SECTIONS = ['CUSTOMERS', 'CONSUMPTIONS', 'POINTS', 'PROGRAM'] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const SECTIONS_MESSAGES = {
  missing: 'Elegí al menos una sección.',
  // El contrato dice solo "400" para un valor que no existe: el texto lo propuso Magali (se lleva al contrato)
  invalid: 'Elegí secciones válidas: Clientes, Consumos, Puntos o Programa.',
} as const;

// Mensaje del primer problema de `sections`, o null. Falta o vacía; valor que no existe o repetido.
export function reportSectionsError(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return SECTIONS_MESSAGES.missing;
  if (typeof raw !== 'string') return SECTIONS_MESSAGES.invalid;
  const parts = raw.split(',').map((part) => part.trim());
  if (parts.some((part) => part === '')) return SECTIONS_MESSAGES.invalid;
  const known = parts.every((part) => (REPORT_SECTIONS as readonly string[]).includes(part));
  if (!known || new Set(parts).size !== parts.length) return SECTIONS_MESSAGES.invalid;
  return null;
}

// Las secciones elegidas, siempre en el orden del contrato: Clientes · Consumos · Puntos · Programa
export function parseReportSections(raw: unknown): ReportSection[] {
  const error = reportSectionsError(raw);
  if (error) throw new StatisticsInputError(error, 'sections');
  const chosen = new Set((raw as string).split(',').map((part) => part.trim()));
  return REPORT_SECTIONS.filter((section) => chosen.has(section));
}
