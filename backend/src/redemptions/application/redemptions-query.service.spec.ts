import { NotFoundException } from '@nestjs/common';
import { DomainError } from '../domain/errors/domain.error.js';
import type {
  CustomerRedemptionsQuery,
  RedemptionListQuery,
  RedemptionRepository,
} from '../domain/port/redemption.repository.js';
import { CUSTOMER_NOT_FOUND_MESSAGE, RedemptionsQueryService } from './redemptions-query.service.js';
import type { RedemptionsExpirationService } from './redemptions-expiration.service.js';

const now = new Date('2026-11-07T18:00:00.000Z');
const customer = { id: 7, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI' as const, documentNumber: '38456001' };

function setup(customerStatus: { isActive: boolean } | null = { isActive: true }) {
  const order: string[] = [];
  const repository = {
    findPageByCustomer: jest.fn(async () => {
      order.push('read');
      return { items: [], total: 0 };
    }),
    findUsableByCustomer: jest.fn(async () => {
      order.push('read');
      return [];
    }),
    findPage: jest.fn(async () => {
      order.push('read');
      return { items: [], total: 0 };
    }),
    findCustomerStatus: jest.fn(async () => customerStatus),
    findCustomer: jest.fn(async () => customer),
  } as unknown as RedemptionRepository;
  const expiration = {
    vencerVencidos: jest.fn(async () => {
      order.push('expire');
      return 0;
    }),
  } as unknown as RedemptionsExpirationService;
  const service = new RedemptionsQueryService(repository, expiration);
  return { service, repository, expiration, order };
}

const pageQuery = (repository: RedemptionRepository, method: 'findPageByCustomer' | 'findPage') =>
  (repository[method] as jest.Mock).mock.calls[0];

describe('RedemptionsQueryService (US-45)', () => {
  describe('listMine (§3.12.1)', () => {
    it('vence al leer los del cliente y después lee, con orden desc por defecto', async () => {
      const { service, repository, expiration, order } = setup();

      const result = await service.listMine({ customerId: 7, page: 1, limit: 20 }, now);

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(expiration.vencerVencidos).toHaveBeenCalledWith({ customerId: 7 }, now);
      expect(order).toEqual(['expire', 'read']);
      const [customerId, query] = pageQuery(repository, 'findPageByCustomer') as [number, CustomerRedemptionsQuery];
      expect(customerId).toBe(7);
      expect(query).toEqual({ statuses: undefined, range: {}, order: 'desc', page: 1, limit: 20 });
    });

    it('Finalizados, un día concreto y orden asc', async () => {
      const { service, repository } = setup();

      await service.listMine(
        { customerId: 7, status: 'FINISHED', fromDate: '2026-11-07', toDate: '2026-11-07', order: 'asc', page: 2, limit: 100 },
        now,
      );

      const [, query] = pageQuery(repository, 'findPageByCustomer') as [number, CustomerRedemptionsQuery];
      expect(query).toEqual({
        statuses: ['USED', 'CANCELLED', 'REJECTED', 'EXPIRED'],
        range: { createdFrom: new Date('2026-11-07T03:00:00.000Z'), createdBefore: new Date('2026-11-08T03:00:00.000Z') },
        order: 'asc',
        page: 2,
        limit: 100,
      });
    });

    it('rango invertido → 400 (DomainError) sin vencer ni leer', async () => {
      const { service, order } = setup();

      await expect(
        service.listMine({ customerId: 7, fromDate: '2026-11-08', toDate: '2026-11-07', page: 1, limit: 20 }, now),
      ).rejects.toThrow(DomainError);
      expect(order).toEqual([]);
    });
  });

  describe('listUsableNow (§3.12.2)', () => {
    it('cliente inexistente → 404 "No existe el cliente."', async () => {
      const { service } = setup(null);

      await expect(service.listUsableNow(99, now)).rejects.toThrow(NotFoundException);
      await expect(service.listUsableNow(99, now)).rejects.toThrow(CUSTOMER_NOT_FOUND_MESSAGE);
      expect(CUSTOMER_NOT_FOUND_MESSAGE).toBe('No existe el cliente.');
    });

    it('cliente dado de baja → lista vacía, sin leer', async () => {
      const { service, order } = setup({ isActive: false });

      await expect(service.listUsableNow(7, now)).resolves.toEqual({ redemptions: [], customer: null });
      expect(order).toEqual([]);
    });

    it('cliente activo: vence al leer y lee los vigentes con la misma hora', async () => {
      const { service, repository, order } = setup();

      await service.listUsableNow(7, now);

      expect(order).toEqual(['expire', 'read']);
      expect(repository.findUsableByCustomer).toHaveBeenCalledWith(7, now);
    });
  });

  describe('listAll (§3.12.3)', () => {
    it('vence al leer todos; sin filtros, orden desc', async () => {
      const { service, repository, expiration, order } = setup();

      await service.listAll({ page: 1, limit: 20 }, now);

      expect(expiration.vencerVencidos).toHaveBeenCalledWith({ all: true }, now);
      expect(order).toEqual(['expire', 'read']);
      const [query] = pageQuery(repository, 'findPage') as [RedemptionListQuery];
      expect(query).toEqual({
        status: undefined,
        document: undefined,
        code: undefined,
        rewardName: undefined,
        range: {},
        order: 'desc',
        page: 1,
        limit: 20,
      });
    });

    it('normaliza documento, código y recompensa; DNI por defecto', async () => {
      const { service, repository } = setup();

      await service.listAll(
        { documentNumber: '38.456', code: 'k7-mp', rewardName: ' CAFÉ ', status: 'REJECTED', page: 1, limit: 10 },
        now,
      );

      const [query] = pageQuery(repository, 'findPage') as [RedemptionListQuery];
      expect(query).toMatchObject({
        document: { type: 'DNI', number: '38456' },
        code: 'K7MP',
        rewardName: 'cafe',
        status: 'REJECTED',
      });
    });

    it('documentType sin documentNumber no filtra; con Pasaporte sí', async () => {
      const { service, repository } = setup();

      await service.listAll({ documentType: 'PASSPORT', page: 1, limit: 10 }, now);
      await service.listAll({ documentType: 'PASSPORT', documentNumber: 'ab12', page: 1, limit: 10 }, now);

      const calls = (repository.findPage as jest.Mock).mock.calls as [RedemptionListQuery][];
      expect(calls[0][0].document).toBeUndefined();
      expect(calls[1][0].document).toEqual({ type: 'PASSPORT', number: 'AB12' });
    });

    it('documentNumber que queda vacío al normalizar se ignora (no es 400)', async () => {
      const { service, repository } = setup();

      await service.listAll({ documentNumber: '...', page: 1, limit: 10 }, now);

      const [query] = pageQuery(repository, 'findPage') as [RedemptionListQuery];
      expect(query.document).toBeUndefined();
    });
  });

  describe('getByCode (US-41, §3.8.1)', () => {
    const stored = { getCustomerId: () => 7 };

    function setupByCode(found: unknown) {
      const ctx = setup();
      (ctx.repository as unknown as { findByCode: jest.Mock }).findByCode = jest.fn(async () => {
        ctx.order.push('read');
        return found;
      });
      return ctx;
    }

    it('normaliza el código, vence al leer y después lee, con el cliente', async () => {
      const { service, repository, expiration, order } = setupByCode(stored);

      const result = await service.getByCode(' k7mp-2x ', now);

      expect(expiration.vencerVencidos).toHaveBeenCalledWith({ code: 'K7MP2X' }, now);
      expect(repository.findByCode).toHaveBeenCalledWith('K7MP2X');
      expect(repository.findCustomer).toHaveBeenCalledWith(7);
      expect(order).toEqual(['expire', 'read']);
      expect(result).toEqual({ redemption: stored, customer });
    });

    it.each(['K7MP2', 'K0MP2X', '', '  - '])('"%s" no cumple el formato: 404 sin tocar la base', async (typed) => {
      const { service, repository, expiration } = setupByCode(stored);

      await expect(service.getByCode(typed, now)).rejects.toEqual(new NotFoundException('Código no encontrado.'));
      expect(expiration.vencerVencidos).not.toHaveBeenCalled();
      expect(repository.findByCode).not.toHaveBeenCalled();
    });

    it('un código con formato válido que no existe: 404 "Código no encontrado."', async () => {
      const { service, repository } = setupByCode(null);

      await expect(service.getByCode('ZZZZZZ', now)).rejects.toEqual(new NotFoundException('Código no encontrado.'));
      expect(repository.findCustomer).not.toHaveBeenCalled();
    });
  });
});
