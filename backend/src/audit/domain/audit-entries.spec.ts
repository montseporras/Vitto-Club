import {
  configurationSavedEntries,
  consumptionRegisteredEntry,
  consumptionVoidedEntry,
  levelsUpdatedEntry,
  customerCreatedEntry,
  customerDeactivatedEntry,
  customerUpdatedEntry,
  employeeUpdatedEntry,
  pointsAdjustedEntry,
  pointsExpiredEntry,
  redemptionConfirmedEntry,
  redemptionUsedEntry,
  redemptionExpiredEntry,
  redemptionRejectedEntry,
  rewardActivatedEntry,
  rewardCreatedEntry,
  rewardDeactivatedEntry,
  rewardDeletedEntry,
  rewardUpdatedEntry,
  rewardDisabledEntry,
  rewardEnabledEntry,
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

describe('pointsExpiredEntry() (US-25)', () => {
  it('actor Sistema, description del contrato y las 3 filas en orden, sin código de operación', () => {
    const entry = pointsExpiredEntry(customer, {
      points: 200,
      // 16/08/2026 21:30 en Argentina
      accreditedAt: new Date('2026-08-17T00:30:00.000Z'),
      balanceAfter: 1040,
    });

    expect(entry).toEqual({
      actor: { type: 'SYSTEM' },
      module: 'POINTS',
      action: 'POINTS_EXPIRED',
      description: 'Venció 200 pts de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      details: [
        { label: 'Puntos vencidos', value: '−200 pts' },
        { label: 'Fecha del lote (acreditación)', value: '16/08/2026' },
        { label: 'Saldo resultante', value: '1.040 pts' },
      ],
    });
    expect(entry.operationCode).toBeUndefined();
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it('puntos de miles y saldo negativo (cliente con deuda)', () => {
    const entry = pointsExpiredEntry(customer, {
      points: 1500,
      accreditedAt: new Date('2025-10-16T18:40:00.000Z'),
      balanceAfter: -30,
    });

    expect(entry.description).toBe('Venció 1.500 pts de Sofía Ríos');
    expect(entry.details).toEqual([
      { label: 'Puntos vencidos', value: '−1.500 pts' },
      { label: 'Fecha del lote (acreditación)', value: '16/10/2025' },
      { label: 'Saldo resultante', value: '-30 pts' },
    ]);
  });
});

describe('consumptionRegisteredEntry() (US-21)', () => {
  const registration = {
    code: 'C-000141',
    amount: 50000,
    baseAmount: 1000,
    pointsAwarded: 10,
    totalPoints: 575,
    bonusPoints: 75,
    balanceAfter: 575,
  };

  it('arma la descripción, el cliente afectado, el código y las filas en orden', () => {
    const entry = consumptionRegisteredEntry(actor, customer, registration);

    expect(entry).toEqual({
      actor,
      module: 'CONSUMPTIONS',
      action: 'CONSUMPTION_REGISTERED',
      description: 'Registró el consumo C-000141 de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      operationCode: 'C-000141',
      details: [
        { label: 'Código de operación', value: 'C-000141' },
        { label: 'Monto', value: '$50.000' },
        { label: 'Equivalencia aplicada', value: '$1.000 = 10 pts' },
        { label: 'Puntos acreditados', value: '+575 pts' },
        { label: 'Bonificación primer consumo', value: '+75 pts' },
        { label: 'Saldo resultante', value: '575 pts' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it('sin bonificación no agrega la fila, y el monto lleva centavos si los tiene', () => {
    const entry = consumptionRegisteredEntry(actor, customer, {
      ...registration,
      amount: 12500.5,
      totalPoints: 125,
      bonusPoints: 0,
      balanceAfter: -175,
    });

    expect(entry.details).toEqual([
      { label: 'Código de operación', value: 'C-000141' },
      { label: 'Monto', value: '$12.500,50' },
      { label: 'Equivalencia aplicada', value: '$1.000 = 10 pts' },
      { label: 'Puntos acreditados', value: '+125 pts' },
      { label: 'Saldo resultante', value: '-175 pts' },
    ]);
  });
});

describe('consumptionVoidedEntry() (US-22)', () => {
  it('tiene la forma del ejemplo de §3.9.4', () => {
    const entry = consumptionVoidedEntry(actor, customer, {
      code: 'C-000131',
      amount: 50000,
      totalPoints: 500,
      balanceAfter: -350,
      reason: 'Consumo registrado al cliente equivocado.',
    });

    expect(entry).toEqual({
      actor,
      module: 'CONSUMPTIONS',
      action: 'CONSUMPTION_VOIDED',
      description: 'Anuló el consumo C-000131 de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      operationCode: 'C-000131',
      details: [
        { label: 'Código de operación', value: 'C-000131' },
        { label: 'Monto', value: '$50.000' },
        { label: 'Puntos revertidos', value: '−500 pts' },
        { label: 'Saldo resultante', value: '-350 pts' },
        { label: 'Motivo', value: 'Consumo registrado al cliente equivocado.' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('rewardCreatedEntry() (US-34)', () => {
  const admin = { type: 'EMPLOYEE' as const, accountId: 1 };

  it('description del contrato y Puntos · Stock · Vencimiento, sin cliente ni código (CA-34.2)', () => {
    const entry = rewardCreatedEntry(admin, { name: 'Medialunas x3', points: 1500, stock: 20, expiresAt: '2026-12-08' });

    expect(entry).toEqual({
      actor: admin,
      module: 'REWARDS',
      action: 'REWARD_CREATED',
      description: 'Creó la recompensa "Medialunas x3"',
      details: [
        { label: 'Puntos', value: '1.500 pts' },
        { label: 'Stock', value: '20' },
        { label: 'Vencimiento', value: '08/12/2026' },
      ],
    });
  });

  it('sin límite y sin vencimiento: "Sin límite" y "No vence" (CA-34.3)', () => {
    const entry = rewardCreatedEntry(admin, { name: 'Café', points: 100, stock: null, expiresAt: null });

    expect(entry.details).toEqual([
      { label: 'Puntos', value: '100 pts' },
      { label: 'Stock', value: 'Sin límite' },
      { label: 'Vencimiento', value: 'No vence' },
    ]);
  });
});

describe('redemptionConfirmedEntry() (US-40)', () => {
  it('tiene la forma de §3.14.2: código, recompensa y puntos', () => {
    const entry = redemptionConfirmedEntry(actor, customer, {
      code: 'K7MP2X',
      rewardName: 'Desayuno completo',
      points: 400,
    });

    expect(entry).toEqual({
      actor,
      module: 'REDEMPTIONS',
      action: 'REDEMPTION_CONFIRMED',
      description: 'Confirmó el canje de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      operationCode: 'K7MP2X',
      details: [
        { label: 'Código del canje', value: 'K7MP2X' },
        { label: 'Recompensa', value: 'Desayuno completo' },
        { label: 'Puntos', value: '400 pts' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('redemptionUsedEntry() (US-42)', () => {
  it('tiene la forma de §3.14.2: código, recompensa, puntos descontados y saldo resultante', () => {
    const entry = redemptionUsedEntry(actor, customer, {
      code: 'K7MP2X',
      rewardName: 'Desayuno completo',
      points: 150,
      balanceAfter: 1090,
    });

    expect(entry).toEqual({
      actor,
      module: 'REDEMPTIONS',
      action: 'REDEMPTION_USED',
      description: 'Registró el uso del canje de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      operationCode: 'K7MP2X',
      details: [
        { label: 'Código del canje', value: 'K7MP2X' },
        { label: 'Recompensa', value: 'Desayuno completo' },
        { label: 'Puntos descontados', value: '−150 pts' },
        { label: 'Saldo resultante', value: '1.090 pts' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('rewardUpdatedEntry() (US-35)', () => {
  const admin = { type: 'EMPLOYEE' as const, accountId: 1 };
  const before = { name: 'Café + medialuna', description: null, points: 150, stock: 0, expiresAt: '2026-12-08' };

  it('CA-35.1: una fila por campo que cambió, "Stock: 0 → 20"', () => {
    const entry = rewardUpdatedEntry(admin, before, { ...before, stock: 20 });

    expect(entry).toEqual({
      actor: admin,
      module: 'REWARDS',
      action: 'REWARD_UPDATED',
      description: 'Editó la recompensa "Café + medialuna"',
      details: [{ label: 'Stock', value: '0 → 20' }],
    });
  });

  it('todos los campos, con "—", "Sin límite", "No vence" y pts; la description con el nombre nuevo', () => {
    const entry = rewardUpdatedEntry(admin, before, {
      name: 'Café doble',
      description: 'Con manteca',
      points: 1200,
      stock: null,
      expiresAt: null,
    });

    expect(entry?.description).toBe('Editó la recompensa "Café doble"');
    expect(entry?.details).toEqual([
      { label: 'Nombre', value: 'Café + medialuna → Café doble' },
      { label: 'Descripción', value: '— → Con manteca' },
      { label: 'Puntos', value: '150 pts → 1.200 pts' },
      { label: 'Stock', value: '0 → Sin límite' },
      { label: 'Vencimiento', value: '08/12/2026 → No vence' },
    ]);
  });

  it('sin cambios → null (no se audita)', () => {
    expect(rewardUpdatedEntry(admin, before, { ...before })).toBeNull();
  });
});

describe('rewardActivatedEntry() y rewardDeactivatedEntry() (US-36)', () => {
  const admin = { type: 'EMPLOYEE' as const, accountId: 1 };

  it.each([
    ['ACTIVE', 'Inactiva → Activa'],
    ['DISABLED', 'Inactiva → Deshabilitada'],
  ] as const)('REWARD_ACTIVATED a %s: "Estado: %s"', (after, value) => {
    expect(rewardActivatedEntry(admin, 'Licuado', after)).toEqual({
      actor: admin,
      module: 'REWARDS',
      action: 'REWARD_ACTIVATED',
      description: 'Activó la recompensa "Licuado"',
      details: [{ label: 'Estado', value }],
    });
  });

  it('REWARD_DEACTIVATED sin canjes: solo "Estado: Activa → Inactiva" (CA-36.1)', () => {
    expect(rewardDeactivatedEntry(admin, 'Licuado', 'ACTIVE', 0)).toEqual({
      actor: admin,
      module: 'REWARDS',
      action: 'REWARD_DEACTIVATED',
      description: 'Desactivó la recompensa "Licuado"',
      details: [{ label: 'Estado', value: 'Activa → Inactiva' }],
    });
  });

  it('REWARD_DEACTIVATED con 2 canjes y desde Deshabilitada (CA-36.2, CA-36.3)', () => {
    expect(rewardDeactivatedEntry(admin, 'Licuado', 'DISABLED', 2).details).toEqual([
      { label: 'Estado', value: 'Deshabilitada → Inactiva' },
      { label: 'Canjes rechazados', value: '2' },
    ]);
  });
});

describe('rewardDeletedEntry() (US-38)', () => {
  const admin = { type: 'EMPLOYEE' as const, accountId: 1 };

  it('sin canjes: "Estado: Activa → Dada de baja" (CA-38.1)', () => {
    expect(rewardDeletedEntry(admin, 'Brunch para dos', 'ACTIVE', 0)).toEqual({
      actor: admin,
      module: 'REWARDS',
      action: 'REWARD_DELETED',
      description: 'Eliminó la recompensa "Brunch para dos"',
      details: [{ label: 'Estado', value: 'Activa → Dada de baja' }],
    });
  });

  it.each([
    ['DISABLED', 'Deshabilitada → Dada de baja'],
    ['INACTIVE', 'Inactiva → Dada de baja'],
  ] as const)('desde %s, con 2 canjes (CA-38.2)', (before, value) => {
    expect(rewardDeletedEntry(admin, 'Brunch para dos', before, 2).details).toEqual([
      { label: 'Estado', value },
      { label: 'Canjes rechazados', value: '2' },
    ]);
  });
});

describe('redemptionExpiredEntry() (US-44)', () => {
  it('actor Sistema, description del contrato, código en operationCode y como primera fila', () => {
    const entry = redemptionExpiredEntry(customer, { code: 'K7MP2X', rewardName: 'Café + medialuna' });

    expect(entry).toEqual({
      actor: { type: 'SYSTEM' },
      module: 'REDEMPTIONS',
      action: 'REDEMPTION_EXPIRED',
      description: 'Venció el canje de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      operationCode: 'K7MP2X',
      details: [
        { label: 'Código del canje', value: 'K7MP2X' },
        { label: 'Recompensa', value: 'Café + medialuna' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('redemptionRejectedEntry() (US-43)', () => {
  it('a nombre del empleado: description, código primero y el motivo al final', () => {
    const entry = redemptionRejectedEntry(actor, customer, {
      code: 'K7MP2X',
      rewardName: 'Café + medialuna',
      reason: 'Sin insumo',
    });

    expect(entry).toEqual({
      actor: { type: 'EMPLOYEE', accountId: 1 },
      module: 'REDEMPTIONS',
      action: 'REDEMPTION_REJECTED',
      description: 'Rechazó el canje de Sofía Ríos',
      affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
      operationCode: 'K7MP2X',
      details: [
        { label: 'Código del canje', value: 'K7MP2X' },
        { label: 'Recompensa', value: 'Café + medialuna' },
        { label: 'Motivo', value: 'Sin insumo' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it('el rechazo automático va con actor Sistema', () => {
    const entry = redemptionRejectedEntry({ type: 'SYSTEM' }, customer, {
      code: 'K7MP2X',
      rewardName: 'Café + medialuna',
      reason: 'Recompensa desactivada',
    });

    expect(entry.actor).toEqual({ type: 'SYSTEM' });
    expect(entry.details[2]).toEqual({ label: 'Motivo', value: 'Recompensa desactivada' });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('customerDeactivatedEntry(): canjes rechazados (US-43, §3.13.1)', () => {
  it('sin canjes rechazados no agrega la fila', () => {
    expect(customerDeactivatedEntry(actor, customer, 120).details).toEqual([
      { label: 'Estado', value: 'Activo → Inactivo' },
      { label: 'Saldo perdido', value: '120 pts' },
    ]);
    expect(customerDeactivatedEntry(actor, customer, 120, 0).details).toHaveLength(2);
  });

  it('con canjes rechazados suma "Canjes rechazados" después de "Saldo perdido"', () => {
    expect(customerDeactivatedEntry(actor, customer, 120, 2).details).toEqual([
      { label: 'Estado', value: 'Activo → Inactivo' },
      { label: 'Saldo perdido', value: '120 pts' },
      { label: 'Canjes rechazados', value: '2' },
    ]);
  });
});

describe('rewardDisabledEntry() y rewardEnabledEntry() (US-37, §3.14.2)', () => {
  it.each([
    ['OUT_OF_STOCK', 'Sin stock'],
    ['EXPIRED', 'Vencida'],
  ] as const)('REWARD_DISABLED con motivo %s → "%s"', (reason, text) => {
    const entry = rewardDisabledEntry('Pizza libre viernes', reason);

    expect(entry).toEqual({
      actor: { type: 'SYSTEM' },
      module: 'REWARDS',
      action: 'REWARD_DISABLED',
      description: 'Deshabilitó la recompensa "Pizza libre viernes"',
      details: [{ label: 'Motivo', value: text }],
    });
    expect(entry.affectedCustomer).toBeUndefined();
    expect(entry.operationCode).toBeUndefined();
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it.each([
    ['OUT_OF_STOCK', 'Stock repuesto'],
    ['EXPIRED', 'Fecha de vencimiento actualizada'],
  ] as const)('REWARD_ENABLED que estaba %s → "%s"', (previousReason, text) => {
    const entry = rewardEnabledEntry('Café + medialuna', previousReason);

    expect(entry).toEqual({
      actor: { type: 'SYSTEM' },
      module: 'REWARDS',
      action: 'REWARD_ENABLED',
      description: 'Habilitó la recompensa "Café + medialuna"',
      details: [{ label: 'Motivo', value: text }],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});
