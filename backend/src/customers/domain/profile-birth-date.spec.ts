import { checkBirthDate } from './profile-birth-date.js';

const NOW = new Date('2026-10-20T15:00:00.000Z');

describe('checkBirthDate (Mi perfil, contrato §3.10.4)', () => {
  it('acepta una fecha válida y la devuelve a las 00:00 UTC', () => {
    expect(checkBirthDate('1990-05-14', NOW)).toEqual({ date: new Date('1990-05-14T00:00:00.000Z') });
  });

  it('acepta el día de hoy y el año 1900', () => {
    expect(checkBirthDate('2026-10-20', NOW)).toEqual({ date: new Date('2026-10-20T00:00:00.000Z') });
    expect(checkBirthDate('1900-01-01', NOW)).toEqual({ date: new Date('1900-01-01T00:00:00.000Z') });
  });

  it('rechaza una fecha futura', () => {
    expect(checkBirthDate('2026-10-21', NOW)).toEqual({ message: 'La fecha no puede ser futura' });
  });

  it('rechaza un año anterior a 1900', () => {
    expect(checkBirthDate('1899-12-31', NOW)).toEqual({ message: 'Esa fecha no existe' });
  });

  it('rechaza fechas que no existen o con otro formato', () => {
    const invalid = { message: 'Esa fecha no existe' };
    expect(checkBirthDate('1990-02-31', NOW)).toEqual(invalid);
    expect(checkBirthDate('1990-13-01', NOW)).toEqual(invalid);
    expect(checkBirthDate('14/05/1990', NOW)).toEqual(invalid);
    expect(checkBirthDate('1990-05-14T00:00:00Z', NOW)).toEqual(invalid);
    expect(checkBirthDate('', NOW)).toEqual(invalid);
  });

  it('acepta el 29 de febrero solo en año bisiesto', () => {
    expect(checkBirthDate('2000-02-29', NOW)).toEqual({ date: new Date('2000-02-29T00:00:00.000Z') });
    expect(checkBirthDate('2001-02-29', NOW)).toEqual({ message: 'Esa fecha no existe' });
  });
});
