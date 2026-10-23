import { AuditController } from './audit.controller.js';
import { AuditQueryService } from '../application/audit-query.service.js';
import type { AuditRecord } from '../domain/audit-record.js';

describe('AuditController', () => {
  let service: { list: jest.Mock; listActors: jest.Mock };
  let controller: AuditController;

  const record: AuditRecord = {
    id: 412,
    createdAt: new Date('2026-10-13T13:05:00.000Z'),
    actorType: 'EMPLOYEE',
    actorAccountId: 9,
    performedBy: 'Valeria Vitto',
    module: 'CUSTOMERS',
    action: 'CUSTOMER_CREATED',
    description: 'Registró al cliente Sofía Ríos',
    affectedCustomer: { customerId: 102, name: 'Sofía Ríos', documentType: 'DNI', documentNumber: '30111222' },
    operationCode: null,
    details: [{ label: 'Mail', value: 'sofia@mail.com' }],
  };

  beforeEach(() => {
    service = { list: jest.fn(), listActors: jest.fn() };
    controller = new AuditController(service as unknown as AuditQueryService);
  });

  it('findAll() devuelve { items, total, page, limit } con la forma del contrato', async () => {
    service.list.mockResolvedValue({ items: [record], total: 1 });

    const result = await controller.findAll({ module: 'CUSTOMERS', page: 1, limit: 10 });

    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ module: 'CUSTOMERS', page: 1, limit: 10 }));
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      items: [
        {
          id: 412,
          createdAt: '2026-10-13T13:05:00.000Z',
          actorType: 'EMPLOYEE',
          actorAccountId: 9,
          performedBy: 'Valeria Vitto',
          module: 'CUSTOMERS',
          action: 'CUSTOMER_CREATED',
          description: 'Registró al cliente Sofía Ríos',
          affectedCustomer: {
            customerId: 102,
            name: 'Sofía Ríos',
            documentType: 'DNI',
            documentNumber: '30111222',
          },
          operationCode: null,
          details: [{ label: 'Mail', value: 'sofia@mail.com' }],
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  });

  it('findAll() sin resultados devuelve la página vacía', async () => {
    service.list.mockResolvedValue({ items: [], total: 0 });

    const result = await controller.findAll({ page: 1, limit: 20 });

    expect({ ...result }).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('findActors() devuelve accountId, name, role y active', async () => {
    service.listActors.mockResolvedValue([
      { accountId: 6, name: 'Denise Nagel', role: 'ADMIN', active: true },
      { accountId: 4, name: 'Diego Sosa', role: 'CASHIER', active: false },
    ]);

    const result = await controller.findActors();

    expect(result.map((actor) => ({ ...actor }))).toEqual([
      { accountId: 6, name: 'Denise Nagel', role: 'ADMIN', active: true },
      { accountId: 4, name: 'Diego Sosa', role: 'CASHIER', active: false },
    ]);
  });
});
