import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DomainError } from '../domain/errors/domain.error.js';
import type { Mission } from '../domain/mission.js';
import { CustomerMissionRepository, CustomerMissionView } from '../domain/port/customer-mission.repository.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { MissionsQueryService } from './missions-query.service.js';

// 15/11/2026 12:00 en Argentina
const NOW = new Date('2026-11-15T15:00:00.000Z');

const mission = (id: number, name: string): Mission => ({
  id,
  name,
  description: null,
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: null,
  timeFrom: null,
  timeTo: null,
  rewardPoints: 50,
  startMonth: '2026-10',
  endMonth: null,
  pendingChanges: null,
  status: 'ACTIVE',
  createdAt: NOW,
  updatedAt: NOW,
});

const assigned = (id: number, missionId: number, name: string, status: CustomerMissionView['status']): CustomerMissionView => ({
  id,
  mission: { id: missionId, name, description: null },
  customerId: 7,
  period: '2026-11',
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: null,
  timeFrom: null,
  timeTo: null,
  rewardPoints: 50,
  progress: 1,
  status,
  completedAt: null,
  claimedAt: null,
  claimedBy: null,
});

class PassthroughRunner implements TransactionRunner {
  run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

function setup(options: { customer?: { isActive: boolean } | null; assignments?: CustomerMissionView[]; running?: Mission[] } = {}) {
  const customer = options.customer === undefined ? { isActive: true } : options.customer;
  const customerMissions = {
    findCustomer: jest.fn().mockResolvedValue(customer ? { id: 7, firstName: 'A', lastName: 'B', documentType: 'DNI', documentNumber: '1', ...customer } : null),
    assignMissing: jest.fn().mockResolvedValue(undefined),
    findForCustomerPeriod: jest.fn().mockResolvedValue(options.assignments ?? []),
  };
  const missions = { findRunningInMonth: jest.fn().mockResolvedValue(options.running ?? []) };
  const service = new MissionsQueryService(
    missions as unknown as MissionRepository,
    customerMissions as unknown as CustomerMissionRepository,
    new PassthroughRunner(),
  );
  return { customerMissions, missions, service };
}

describe('MissionsQueryService.listMine (§3.3.2)', () => {
  it('en el mes actual asigna primero las en curso, con su snapshot, y devuelve las del mes ordenadas', async () => {
    const { customerMissions, service } = setup({
      running: [mission(1, 'Vení 3 veces')],
      assignments: [assigned(11, 2, 'B', 'CLAIMED'), assigned(10, 1, 'Vení 3 veces', 'IN_PROGRESS')],
    });

    const result = await service.listMine(7, undefined, NOW);

    expect(customerMissions.assignMissing).toHaveBeenCalledWith(7, '2026-11', [
      expect.objectContaining({ missionId: 1, target: 3, rewardPoints: 50 }),
    ]);
    expect(customerMissions.findForCustomerPeriod).toHaveBeenCalledWith(7, '2026-11');
    expect(result.map((item) => item.id)).toEqual([10, 11]);
  });

  it('?period con el mes actual es lo mismo que sin period (asigna)', async () => {
    const { customerMissions, service } = setup();
    await service.listMine(7, '2026-11', NOW);
    expect(customerMissions.assignMissing).toHaveBeenCalled();
  });

  it('un mes anterior solo lee: no asigna', async () => {
    const { customerMissions, service } = setup();
    await service.listMine(7, '2026-10', NOW);
    expect(customerMissions.assignMissing).not.toHaveBeenCalled();
    expect(customerMissions.findForCustomerPeriod).toHaveBeenCalledWith(7, '2026-10');
  });

  it('mes inválido → DomainError "Elegí un mes de los últimos 12."', async () => {
    const { service } = setup();
    await expect(service.listMine(7, '2026-12', NOW)).rejects.toThrow(DomainError);
    await expect(service.listMine(7, '2025-11', NOW)).rejects.toThrow('Elegí un mes de los últimos 12.');
  });

  it('cliente dado de baja con token vivo → 401, sin asignar', async () => {
    const { customerMissions, service } = setup({ customer: { isActive: false } });
    await expect(service.listMine(7, undefined, NOW)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(customerMissions.assignMissing).not.toHaveBeenCalled();
  });
});

describe('MissionsQueryService.listForCustomer (§3.3.4)', () => {
  it('no asigna: las en curso que faltan aparecen sin id, progreso 0 y En progreso', async () => {
    const { customerMissions, service } = setup({
      running: [mission(1, 'Asignada'), mission(2, 'Falta')],
      assignments: [assigned(10, 1, 'Asignada', 'COMPLETED')],
    });

    const result = await service.listForCustomer(7, undefined, NOW);

    expect(customerMissions.assignMissing).not.toHaveBeenCalled();
    expect(result.map((item) => [item.id, item.mission.name, item.status, item.progress])).toEqual([
      [null, 'Falta', 'IN_PROGRESS', 0],
      [10, 'Asignada', 'COMPLETED', 1],
    ]);
    expect(result[0]).toMatchObject({ period: '2026-11', target: 3, rewardPoints: 50, completedAt: null });
  });

  it('un mes anterior: solo las asignadas', async () => {
    const { missions, service } = setup({ assignments: [assigned(10, 1, 'A', 'EXPIRED')] });

    const result = await service.listForCustomer(7, '2026-10', NOW);

    expect(missions.findRunningInMonth).not.toHaveBeenCalled();
    expect(result.map((item) => item.id)).toEqual([10]);
  });

  it('inexistente → 404 "No existe el cliente."; dado de baja → []', async () => {
    await expect(setup({ customer: null }).service.listForCustomer(7, undefined, NOW)).rejects.toThrow(
      new NotFoundException('No existe el cliente.'),
    );
    await expect(setup({ customer: { isActive: false } }).service.listForCustomer(7, undefined, NOW)).resolves.toEqual([]);
  });
});
