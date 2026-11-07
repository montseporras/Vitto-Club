import {
  generarCodigo,
  generarCodigoUnico,
  MAX_REDEMPTION_CODE_ATTEMPTS,
  normalizarCodigo,
  REDEMPTION_CODE_ALPHABET,
  RedemptionCodeGenerationError,
} from './redemption-code.js';

// Devuelve, en orden, los índices del alfabeto que se le pasan (y vuelve a empezar)
function sequence(...indexes: number[]) {
  let i = 0;
  return (max: number) => {
    const value = indexes[i % indexes.length];
    i++;
    if (value >= max) throw new Error('index out of range');
    return value;
  };
}

const indexOf = (char: string) => REDEMPTION_CODE_ALPHABET.indexOf(char);

// BASE-4, CA-B4.5 (contrato S4 §3.6.1)
describe('código de canje', () => {
  describe('alfabeto', () => {
    it('tiene 32 caracteres, sin 0, O, 1 ni I', () => {
      expect(REDEMPTION_CODE_ALPHABET).toHaveLength(32);
      for (const forbidden of ['0', 'O', '1', 'I']) {
        expect(REDEMPTION_CODE_ALPHABET).not.toContain(forbidden);
      }
    });
  });

  describe('generarCodigo', () => {
    it('arma 6 caracteres con los índices que da el generador aleatorio', () => {
      const random = sequence(...'K7MP2X'.split('').map(indexOf));
      expect(generarCodigo(random)).toBe('K7MP2X');
    });

    it('con crypto.randomInt: 6 caracteres del alfabeto (100 muestras)', () => {
      for (let i = 0; i < 100; i++) {
        expect(generarCodigo()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      }
    });
  });

  describe('generarCodigoUnico', () => {
    it('si el primero no existe, lo devuelve', async () => {
      const existe = jest.fn(async () => false);
      const code = await generarCodigoUnico(existe, sequence(indexOf('A')));

      expect(code).toBe('AAAAAA');
      expect(existe).toHaveBeenCalledTimes(1);
    });

    it('si choca, reintenta con otro', async () => {
      // Primer intento AAAAAA (existe), segundo BBBBBB
      const random = sequence(...Array(6).fill(indexOf('A')), ...Array(6).fill(indexOf('B')));
      const existe = jest.fn(async (code: string) => code === 'AAAAAA');

      expect(await generarCodigoUnico(existe, random)).toBe('BBBBBB');
      expect(existe).toHaveBeenCalledTimes(2);
    });

    it(`si choca ${MAX_REDEMPTION_CODE_ATTEMPTS} veces, error (se responde 500)`, async () => {
      const existe = jest.fn(async () => true);

      await expect(generarCodigoUnico(existe)).rejects.toBeInstanceOf(RedemptionCodeGenerationError);
      expect(existe).toHaveBeenCalledTimes(MAX_REDEMPTION_CODE_ATTEMPTS);
    });
  });

  describe('normalizarCodigo', () => {
    it('" k7mp-2x " → "K7MP2X"', () => {
      expect(normalizarCodigo(' k7mp-2x ')).toBe('K7MP2X');
    });

    it('saca espacios y guiones del medio', () => {
      expect(normalizarCodigo('k7 mp - 2x')).toBe('K7MP2X');
    });

    it.each([
      ['con 0', 'K7MP20'],
      ['con O', 'K7MPOX'],
      ['con 1', 'K7MP1X'],
      ['con I', 'K7MPIX'],
      ['corto', 'K7MP2'],
      ['largo', 'K7MP2XY'],
      ['vacío', '   '],
      ['con otros símbolos', 'K7MP2#'],
    ])('%s: null (se trata como inexistente)', (_case, raw) => {
      expect(normalizarCodigo(raw)).toBeNull();
    });
  });
});
