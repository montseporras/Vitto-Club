import { DEFAULT_CORS_ORIGIN, parseCorsOrigins } from './cors-origins.js';

describe('parseCorsOrigins (A4-07)', () => {
  it('sin la variable queda el origen de Vite, como estaba fijo en main.ts', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:5173']);
    expect(DEFAULT_CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('vacía o solo con espacios y comas: también el origen de Vite', () => {
    expect(parseCorsOrigins('')).toEqual(['http://localhost:5173']);
    expect(parseCorsOrigins('  , ,')).toEqual(['http://localhost:5173']);
  });

  it('un origen', () => {
    expect(parseCorsOrigins('https://vitto.vercel.app')).toEqual(['https://vitto.vercel.app']);
  });

  it('varios separados por coma, sin espacios de más', () => {
    expect(parseCorsOrigins(' http://localhost:5173 , https://vitto.vercel.app ')).toEqual([
      'http://localhost:5173',
      'https://vitto.vercel.app',
    ]);
  });
});
