import { assertLevelThresholds, thresholdFormatError } from './levels.js';
import { DomainError } from './errors/domain.error.js';
import { LoyaltyProgramConfiguration } from './loyalty-program-configuration.js';

describe('thresholdFormatError()', () => {
  it.each([undefined, null, ''])('vacío (%p) → "Completá este campo."', (value) => {
    expect(thresholdFormatError(value)).toBe('Completá este campo.');
  });

  it.each([1.5, '300', 'abc', Number.NaN])('no entero (%p) → "Ingresá un número entero, sin decimales."', (value) => {
    expect(thresholdFormatError(value)).toBe('Ingresá un número entero, sin decimales.');
  });

  it('mayor al máximo → mensaje del máximo', () => {
    expect(thresholdFormatError(2_147_483_648)).toBe('Ingresá un número menor o igual a 2.147.483.647.');
    expect(thresholdFormatError(2_147_483_647)).toBeNull();
  });
});

describe('assertLevelThresholds() — §3.7.2', () => {
  it('acepta Plata > 0 y Oro > Plata', () => {
    expect(() => assertLevelThresholds({ silverMinPoints: 1, goldMinPoints: 2 })).not.toThrow();
  });

  it.each([0, -5])('Plata %d → error en silverMinPoints', (silver) => {
    expect(() => assertLevelThresholds({ silverMinPoints: silver, goldMinPoints: 800 })).toThrow(
      new DomainError('El umbral de Plata debe ser mayor que 0', 'silverMinPoints'),
    );
  });

  it.each([300, 200])('Oro %d con Plata 300 → error en goldMinPoints', (gold) => {
    expect(() => assertLevelThresholds({ silverMinPoints: 300, goldMinPoints: gold })).toThrow(
      new DomainError('El umbral de Oro debe ser mayor que el de Plata', 'goldMinPoints'),
    );
  });
});

describe('LoyaltyProgramConfiguration.createNextVersion() con niveles — CA-27.2 / CA-27.5', () => {
  const current = LoyaltyProgramConfiguration.define({
    version: 3,
    baseAmount: 1000,
    pointsAwarded: 10,
    pointsExpirationMonths: 12,
    bonusType: null,
    bonusValue: null,
    silverMinPoints: 400,
    goldMinPoints: 900,
    frequentMinConsumptions: 3,
    isActive: true,
    validFrom: new Date(),
    validTo: null,
    createdAt: new Date(),
  });

  it('copia los umbrales vigentes cuando no vienen', () => {
    const next = LoyaltyProgramConfiguration.createNextVersion(current, { pointsExpirationMonths: 6 });

    expect(next).toMatchObject({ version: 4, silverMinPoints: 400, goldMinPoints: 900, pointsExpirationMonths: 6 });
  });

  it('usa los umbrales que vienen y copia el resto', () => {
    const next = LoyaltyProgramConfiguration.createNextVersion(current, { silverMinPoints: 500, goldMinPoints: 1000 });

    expect(next).toMatchObject({ silverMinPoints: 500, goldMinPoints: 1000, baseAmount: 1000, pointsAwarded: 10 });
  });

  it('valida Oro contra la Plata vigente cuando llega uno solo', () => {
    expect(() => LoyaltyProgramConfiguration.createNextVersion(current, { goldMinPoints: 400 })).toThrow(
      'El umbral de Oro debe ser mayor que el de Plata',
    );
  });

  it('sin versión vigente arranca en 300 y 800', () => {
    expect(LoyaltyProgramConfiguration.createNextVersion(null, {})).toMatchObject({
      version: 1,
      silverMinPoints: 300,
      goldMinPoints: 800,
      frequentMinConsumptions: 3,
    });
  });
});

describe('LoyaltyProgramConfiguration.createNextVersion() con cliente frecuente — S5-22', () => {
  const current = LoyaltyProgramConfiguration.define({
    version: 2,
    baseAmount: 1000,
    pointsAwarded: 10,
    pointsExpirationMonths: 12,
    bonusType: null,
    bonusValue: null,
    silverMinPoints: 300,
    goldMinPoints: 800,
    frequentMinConsumptions: 5,
    isActive: true,
    validFrom: new Date(),
    validTo: null,
    createdAt: new Date(),
  });

  it('copia el mínimo vigente al cambiar cualquier otra cosa (no vuelve a 3)', () => {
    const next = LoyaltyProgramConfiguration.createNextVersion(current, { silverMinPoints: 400 });

    expect(next.frequentMinConsumptions).toBe(5);
  });

  it('usa el mínimo que viene', () => {
    const next = LoyaltyProgramConfiguration.createNextVersion(current, { frequentMinConsumptions: 7 });

    expect(next).toMatchObject({ frequentMinConsumptions: 7, silverMinPoints: 300 });
  });

  it('sin versión anterior usa 3', () => {
    expect(LoyaltyProgramConfiguration.createNextVersion(null, {}).frequentMinConsumptions).toBe(3);
  });

  it('un mínimo fuera de 1–100 es un error', () => {
    expect(() => LoyaltyProgramConfiguration.createNextVersion(current, { frequentMinConsumptions: 101 })).toThrow(
      'Ingresá un número entero de 1 a 100.',
    );
  });
});
