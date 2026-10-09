import { ROLES_KEY } from '../../shared/security/roles.decorator.js';
import { AuditService } from '../application/audit.service.js';
import { AuditController } from './audit.controller.js';
import { AuditQueryDto } from './audit-query.dto.js';

describe('AuditController', () => {
  it('exposes only the read-only listing to administrators', async () => {
    expect(Reflect.getMetadata('path', AuditController)).toBe('auditoria');
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual(['ADMIN']);
    expect(Object.getOwnPropertyNames(AuditController.prototype)).toEqual([
      'constructor',
      'list',
    ]);

    const list = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const controller = new AuditController({ list } as unknown as AuditService);
    const query = Object.assign(new AuditQueryDto(), { page: 2, limit: 10 });

    await expect(controller.list(query)).resolves.toEqual({
      items: [],
      total: 0,
      page: 2,
      limit: 10,
    });
    expect(list).toHaveBeenCalledWith({
      performedBy: undefined,
      category: undefined,
      documentType: undefined,
      documentNumber: undefined,
      date: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 2,
      limit: 10,
    });
  });
});
