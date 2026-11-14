import { toArgentinaParts } from '../../shared/time/argentina-date.js';

// Formato argentino para el reporte PDF: punto de miles, coma decimal, fecha dd/mm/aaaa

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SHORT_MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// 36.4 → "36,4"; 1234567 → "1.234.567"
export function formatNumber(value: number, maxDecimals = 0): string {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}

export function formatMoney(value: number): string {
  return `$ ${formatNumber(value, 2)}`;
}

// Con un decimal fijo: 17.4 → "17,4 %"
export function formatPercent(value: number): string {
  return `${value.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

// Con signo, para las variaciones y el saldo neto: +8,5 % / -3,2 %
export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercent(value)}`;
}

export function formatSignedNumber(value: number): string {
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

// "2026-11" → "noviembre"
export function monthName(value: string): string {
  return MONTH_NAMES[Number(value.slice(5, 7)) - 1];
}

// "2026-11" → "Noviembre 2026"
export function monthLabel(value: string): string {
  return `${capitalize(monthName(value))} ${value.slice(0, 4)}`;
}

// "2026-06" → "Jun 26"
export function shortMonthLabel(value: string): string {
  return `${SHORT_MONTH_NAMES[Number(value.slice(5, 7)) - 1]} ${value.slice(2, 4)}`;
}

const two = (value: number): string => String(value).padStart(2, '0');

// dd/mm/aaaa, en hora de Argentina
export function formatDate(date: Date): string {
  const { year, month, day } = toArgentinaParts(date);
  return `${two(day)}/${two(month)}/${year}`;
}

// dd/mm/aaaa hh:mm, en hora de Argentina
export function formatDateTime(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return `${formatDate(date)} ${two(shifted.getUTCHours())}:${two(shifted.getUTCMinutes())}`;
}
