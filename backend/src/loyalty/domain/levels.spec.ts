import {
  assertBenefit,
  assertLevelThresholds,
  benefitError,
  LEVEL_MESSAGES,
  normalizeBenefit,
  thresholdFormatError,
} from './levels.js';
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

describe('beneficios de los niveles — NIV-BEN (S5 §3.10)', () => {
  it('normalizeBenefit: recorta los bordes y vacío = null', () => {
    expect(normalizeBenefit('  Postre gratis ')).toBe('Postre gratis');
    expect(normalizeBenefit('')).toBeNull();
    expect(normalizeBenefit('   ')).toBeNull();
    expect(normalizeBenefit(null)).toBeNull();
    expect(normalizeBenefit(undefined)).toBeNull();
  });

  it('benefitError: hasta 255 caracteres sin contar los bordes; 256 da el mensaje del contrato', () => {
    expect(benefitError('a'.repeat(255))).toBeNull();
    expect(benefitError('  ' + 'a'.repeat(255) + '  ')).toBeNull();
    expect(benefitError('a'.repeat(256))).toBe('El beneficio no puede superar los 255 caracteres.');
  });

  it('benefitError cuenta caracteres como la base: un emoji es uno', () => {
    expect(benefitError('😀'.repeat(255))).toBeNull();
    expect(benefitError('😀'.repeat(256))).toBe(LEVEL_MESSAGES.benefitTooLong);
  });

  it('benefitError: ausente o null está bien; algo que no es texto, no', () => {
    expect(benefitError(undefined)).toBeNull();
    expect(benefitError(null)).toBeNull();
    expect(benefitError(5)).toBe(LEVEL_MESSAGES.benefitNotText);
  });

  it('assertBenefit lanza un DomainError sobre el campo del nivel', () => {
    expect(() => assertBenefit('a'.repeat(256), 'silverBenefit')).toThrow(
      new DomainError('El beneficio no puede superar los 255 caracteres.', 'silverBenefit'),
    );
    expect(() => assertBenefit(null, 'goldBenefit')).not.toThrow();
  });
});

describe('LoyaltyProgramConfiguration con beneficios — NIV-BEN', () => {
  const base = {
    version: 3,
    baseAmount: 1000,
    pointsAwarded: 10,
    pointsExpirationMonths: 12,
    bonusType: null,
    bonusValue: null,
    silverMinPoints: 400,
    goldMinPoints: 900,
    isActive: true,
    validFrom: new Date(),
    validTo: null,
    createdAt: new Date(),
  };
  const current = LoyaltyProgramConfiguration.define({
    ...base,
    bronzeBenefit: 'Café de bienvenida',
    silverBenefit: 'Postre gratis',
    goldBenefit: null,
  });

  it('define() rechaza un beneficio de más de 255 caracteres', () => {
    expect(() =>
      LoyaltyProgramConfiguration.define({
        ...base,
        bronzeBenefit: null,
        silverBenefit: 'a'.repeat(256),
        goldBenefit: null,
      }),
    ).toThrow('El beneficio no puede superar los 255 caracteres.');
  });

  it('los getters devuelven cada beneficio', () => {
    expect(current.getBronzeBenefit()).toBe('Café de bienvenida');
    expect(current.getSilverBenefit()).toBe('Postre gratis');
    expect(current.getGoldBenefit()).toBeNull();
  });

  it('una versión nueva copia los beneficios vigentes si no vienen', () => {
    const next = LoyaltyProgramConfiguration.createNextVersion(current, { pointsExpirationMonths: 6 });

    expect(next).toMatchObject({
      bronzeBenefit: 'Café de bienvenida',
      silverBenefit: 'Postre gratis',
      goldBenefit: null,
    });
  });

  it('un beneficio que viene reemplaza al vigente; vacío o null lo borra', () => {
    const next = LoyaltyProgramConfiguration.createNextVersion(current, {
      bronzeBenefit: null,
      silverBenefit: '  Postre y café  ',
      goldBenefit: '',
    });

    expect(next).toMatchObject({ bronzeBenefit: null, silverBenefit: 'Postre y café', goldBenefit: null });
  });

  it('un beneficio de más de 255 caracteres no genera versión', () => {
    expect(() =>
      LoyaltyProgramConfiguration.createNextVersion(current, { goldBenefit: 'a'.repeat(256) }),
    ).toThrow('El beneficio no puede superar los 255 caracteres.');
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
    bronzeBenefit: null,
    silverBenefit: null,
    goldBenefit: null,
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
      bronzeBenefit: null,
      silverBenefit: null,
      goldBenefit: null,
    });
  });
});
