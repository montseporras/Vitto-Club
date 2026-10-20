import { readCookie } from './refresh-cookie.js';

describe('readCookie', () => {
  it('encuentra la cookie pedida entre varias', () => {
    expect(readCookie('theme=dark; refresh_token=abc123; lang=es', 'refresh_token')).toBe('abc123');
  });

  it('devuelve undefined si no hay encabezado o no está esa cookie', () => {
    expect(readCookie(undefined, 'refresh_token')).toBeUndefined();
    expect(readCookie('theme=dark', 'refresh_token')).toBeUndefined();
    expect(readCookie('', 'refresh_token')).toBeUndefined();
  });

  it('conserva un valor que contiene el signo igual', () => {
    expect(readCookie('refresh_token=abc=def', 'refresh_token')).toBe('abc=def');
  });
});
