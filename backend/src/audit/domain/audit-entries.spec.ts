import {
  configurationSavedEntries,
  levelsUpdatedEntry,
  customerCreatedEntry,
  customerDeactivatedEntry,
  customerUpdatedEntry,
  employeeUpdatedEntry,
  pointsAdjustedEntry,
  type CustomerSnapshot,
  type EmployeeSnapshot,
  type LoyaltyConfigSnapshot,
} from './audit-entries.js';
import { assertValidAuditEntry, type AuditActor } from './audit-entry.js';

const actor: AuditActor = { type: 'EMPLOYEE', accountId: 1 };

const employee: EmployeeSnapshot = {
  firstName: 'Jorge',
  lastName: 'Molina',
  email: 'jorge@vitto.club',
  role: 'CASHIER',
  phone: null,
};

const customer: CustomerSnapshot = {
  id: 102,
  firstName: 'Sofía',
  lastName: 'Ríos',
  documentType: 'DNI',
  documentNumber: '30111222',
  email: 'sofia@mail.com',
  phone: '3510000000',
  dateOfBirth: new Date('1990-03-05T00:00:00.000Z'),
};

const config: LoyaltyConfigSnapshot = {
  baseAmount: 1000,
  pointsAwarded: 10,
  pointsExpirationMonths: 12,
  bonusType: 'PERCENTAGE',
  bonusValue: 15,
  silverMinPoints: 300,
  goldMinPoints: 800,
};

describe('employeeUpdatedEntry()', () => {
  it('una fila por campo que cambió, con vacío como "—"', () => {
    const entry = employeeUpdatedEntry(
      actor,
      employee,
      { ...employee, lastName: 'Molinas', phone: '3510000001', role: 'ADMIN' },
    );

    expect(entry.description).toBe('Editó al empleado Jorge Molinas');
    expect(entry.details).toEqual([
      { label: 'Apellido', value: 'Molina → Molinas' },
      { label: 'Teléfono', value: '— → 3510000001' },
      { label: 'Rol', value: 'Cajero → Administrador' },
    ]);
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('customerCreatedEntry()', () => {
  it('lleva el cliente afectado y nunca guarda el valor de la contraseña inicial', () => {
    const entry = customerCreatedEntry(actor, customer, 'CASHIER');

    expect(entry.affectedCustomer).toEqual({
      customerId: 102,
      name: 'Sofía Ríos',
      documentType: 'DNI',
      documentNumber: '30111222',
    });
    expect(entry.details).toEqual([
      { label: 'Mail', value: 'sofia@mail.com' },
      { label: 'Teléfono', value: '3510000000' },
      { label: 'Origen', value: 'Caja' },
      { label: 'Cuenta de acceso', value: 'Creada, contraseña inicial = número de documento' },
    ]);
    expect(JSON.stringify(entry.details)).not.toContain('30111222');
  });

  it('el origen es Administración cuando lo da de alta el Administrador', () => {
    const entry = customerCreatedEntry(actor, { ...customer, phone: null }, 'ADMIN');

    expect(entry.details).toContainEqual({ label: 'Origen', value: 'Administración' });
    expect(entry.details).toContainEqual({ label: 'Teléfono', value: '—' });
  });
});

describe('customerUpdatedEntry()', () => {
  it('una fila por campo que cambió, con documento y fecha dd/mm/aaaa', () => {
    const entry = customerUpdatedEntry(actor, customer, {
      ...customer,
      documentNumber: '30111223',
      dateOfBirth: new Date('1990-03-06T00:00:00.000Z'),
    });

    expect(entry.details).toEqual([
      { label: 'Documento', value: 'DNI 30111222 → DNI 30111223' },
      { label: 'Fecha de nacimiento', value: '05/03/1990 → 06/03/1990' },
    ]);
  });
});

describe('customerUpdatedEntry() con motivo (CLI-ADM)', () => {
  it('agrega la fila "Motivo" al final, solo si se mandó reason', () => {
    const changed = { ...customer, phone: '3510000009' };

    expect(customerUpdatedEntry(actor, customer, changed, 'Error de carga').details).toEqual([
      { label: 'Teléfono', value: '3510000000 → 3510000009' },
      { label: 'Motivo', value: 'Error de carga' },
    ]);
    expect(customerUpdatedEntry(actor, customer, changed).details).toEqual([
      { label: 'Teléfono', value: '3510000000 → 3510000009' },
    ]);
  });
});

describe('pointsAdjustedEntry()', () => {
  it('ADD: Cantidad con +, Saldo resultante y Motivo, con el cliente afectado', () => {
    const entry = pointsAdjustedEntry(actor, customer, {
      points: 350,
      balanceAfter: 0,
      reason: 'Regularización por anulación de consumo',
    });

    expect(entry).toEqual({
      actor,
      module: 'POINTS',
      action: 'POINTS_ADJUSTED',
      description: 'Ajustó puntos de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      details: [
        { label: 'Cantidad', value: '+350 pts' },
        { label: 'Saldo resultante', value: '0 pts' },
        { label: 'Motivo', value: 'Regularización por anulación de consumo' },
      ],
    });
    expect(entry.operationCode).toBeUndefined();
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it('SUBTRACT: Cantidad con el signo menos de §3.9.4 y puntos de miles', () => {
    const entry = pointsAdjustedEntry(actor, customer, { points: -1200, balanceAfter: 1350, reason: 'Corrección' });

    expect(entry.details).toEqual([
      { label: 'Cantidad', value: '−1.200 pts' },
      { label: 'Saldo resultante', value: '1.350 pts' },
      { label: 'Motivo', value: 'Corrección' },
    ]);
  });

  it('Saldo resultante negativo: con el guion común, como el ejemplo de §3.9.4', () => {
    const entry = pointsAdjustedEntry(actor, customer, { points: 50, balanceAfter: -350, reason: 'Parcial' });

    expect(entry.details[1]).toEqual({ label: 'Saldo resultante', value: '-350 pts' });
  });
});

describe('customerDeactivatedEntry()', () => {
  it('guarda Estado y Saldo perdido, con puntos de miles', () => {
    const entry = customerDeactivatedEntry(actor, customer, 1250);

    expect(entry.action).toBe('CUSTOMER_DEACTIVATED');
    expect(entry.details).toEqual([
      { label: 'Estado', value: 'Activo → Inactivo' },
      { label: 'Saldo perdido', value: '1.250 pts' },
    ]);
  });

  it('un cliente sin puntos pierde 0 pts', () => {
    expect(customerDeactivatedEntry(actor, customer, 0).details[1]).toEqual({
      label: 'Saldo perdido',
      value: '0 pts',
    });
  });
});

describe('levelsUpdatedEntry() — US-27', () => {
  it('Plata y Oro con antes → después en pts, con puntos de miles', () => {
    const entry = levelsUpdatedEntry(actor, config, { ...config, silverMinPoints: 400, goldMinPoints: 1500 });

    assertValidAuditEntry(entry);
    expect(entry).toMatchObject({
      module: 'CONFIGURATION',
      action: 'LEVELS_UPDATED',
      description: 'Modificó niveles',
    });
    expect(entry.details).toEqual([
      { label: 'Plata', value: '300 → 400 pts' },
      { label: 'Oro', value: '800 → 1.500 pts' },
    ]);
  });

  it('sin cambios: la fila fija "Cambios"', () => {
    const entry = levelsUpdatedEntry(actor, config, { ...config });

    expect(entry.details).toEqual([{ label: 'Cambios', value: 'Se guardó sin modificar valores' }]);
  });
});

describe('configurationSavedEntries()', () => {
  it('registra una entrada por cada sección que cambió (CA-57.7)', () => {
    const entries = configurationSavedEntries(actor, config, {
      ...config,
      baseAmount: 2000,
      bonusValue: 20,
    });

    expect(entries.map((entry) => entry.action)).toEqual([
      'POINTS_EQUIVALENCE_UPDATED',
      'FIRST_CONSUMPTION_BONUS_UPDATED',
    ]);
    expect(entries[0].details).toEqual([
      { label: 'Monto base ($)', value: '1.000 → 2.000' },
      { label: 'Puntos por monto', value: '10 → 10' },
    ]);
  });

  it('si no cambió nada registra una entrada con "Se guardó sin modificar valores"', () => {
    const entries = configurationSavedEntries(actor, config, { ...config });

    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('POINTS_EQUIVALENCE_UPDATED');
    expect(entries[0].details).toEqual([
      { label: 'Cambios', value: 'Se guardó sin modificar valores' },
    ]);
  });
});

describe('configurationSavedEntries() con niveles — US-27', () => {
  it('si cambian los umbrales, agrega LEVELS_UPDATED', () => {
    const entries = configurationSavedEntries(actor, config, { ...config, goldMinPoints: 1000 });

    expect(entries.map((entry) => entry.action)).toEqual(['LEVELS_UPDATED']);
    expect(entries[0].details).toEqual([
      { label: 'Plata', value: '300 → 300 pts' },
      { label: 'Oro', value: '800 → 1.000 pts' },
    ]);
  });
});
