import { checkNewPassword, PASSWORD_SAME_AS_CURRENT, PASSWORD_SAME_AS_DOCUMENT } from './password-policy.js';

const base = {
  currentPassword: '30111222',
  accountEmail: 'marcos@mail.com',
  documentNumber: '30111222',
};

describe('checkNewPassword (política de contraseña, contrato §3.11)', () => {
  it('acepta una contraseña que cumple todas las reglas', () => {
    expect(checkNewPassword({ ...base, newPassword: 'MiClave2026' })).toBeNull();
  });

  it('exige que no esté vacía', () => {
    expect(checkNewPassword({ ...base, newPassword: '' })).toEqual({ message: 'Este campo es obligatorio' });
  });

  it('exige entre 8 y 64 caracteres', () => {
    const message = 'Tiene que tener entre 8 y 64 caracteres';
    expect(checkNewPassword({ ...base, newPassword: 'a'.repeat(7) })).toEqual({ message });
    expect(checkNewPassword({ ...base, newPassword: 'a'.repeat(8) })).toBeNull();
    expect(checkNewPassword({ ...base, newPassword: 'a'.repeat(64) })).toBeNull();
    expect(checkNewPassword({ ...base, newPassword: 'a'.repeat(65) })).toEqual({ message });
  });

  it('limita a 72 bytes en UTF-8: 40 letras con tilde son 80 bytes aunque sean menos de 64 caracteres', () => {
    expect(checkNewPassword({ ...base, newPassword: 'é'.repeat(40) })).toEqual({
      message: 'La contraseña es demasiado larga',
    });
    expect(checkNewPassword({ ...base, newPassword: 'é'.repeat(36) })).toBeNull();
  });

  it('no puede ser igual al mail (comparación literal)', () => {
    expect(checkNewPassword({ ...base, newPassword: 'marcos@mail.com' })).toEqual({
      message: 'La contraseña no puede ser igual al mail',
    });
    expect(checkNewPassword({ ...base, newPassword: 'MARCOS@mail.com' })).toBeNull();
  });

  it('no puede ser igual a la actual', () => {
    expect(checkNewPassword({ ...base, currentPassword: 'ClaveActual1', newPassword: 'ClaveActual1' })).toEqual({
      code: PASSWORD_SAME_AS_CURRENT,
      message: 'La nueva contraseña no puede ser igual a la actual',
    });
  });

  it('en una cuenta de cliente no puede ser su número de documento', () => {
    expect(checkNewPassword({ ...base, currentPassword: 'ClaveActual1', newPassword: '30111222' })).toEqual({
      code: PASSWORD_SAME_AS_DOCUMENT,
      message: 'La contraseña no puede ser tu número de documento',
    });
  });

  it('sin documento (empleados) esa regla no se aplica', () => {
    expect(
      checkNewPassword({ ...base, documentNumber: undefined, currentPassword: 'ClaveActual1', newPassword: '30111222' }),
    ).toBeNull();
  });

  it('no normaliza: un documento con otras mayúsculas cuenta como distinto', () => {
    expect(
      checkNewPassword({ ...base, documentNumber: 'AB123456', currentPassword: 'ClaveActual1', newPassword: 'ab123456' }),
    ).toBeNull();
  });

  it('informa primero la regla que viene antes en el contrato', () => {
    // Igual a la actual y corta: gana el largo
    expect(checkNewPassword({ ...base, currentPassword: 'corta', newPassword: 'corta' })).toEqual({
      message: 'Tiene que tener entre 8 y 64 caracteres',
    });
    // Igual a la actual y al documento: gana la actual
    expect(checkNewPassword({ ...base, newPassword: '30111222' })?.code).toBe(PASSWORD_SAME_AS_CURRENT);
  });
});
