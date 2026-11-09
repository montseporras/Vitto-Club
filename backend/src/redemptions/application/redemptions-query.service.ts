import { Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentType } from '../../customers/domain/customer.js';
import type { Redemption, RedemptionStatus } from '../domain/redemption.js';
import {
  buildRedemptionDateRange,
  foldRewardNameFilter,
  normalizeCodeFilter,
  normalizeDocumentFilter,
  statusesOfGroup,
  type RedemptionOrder,
  type RedemptionStatusGroup,
} from '../domain/redemption-filters.js';
import {
  RedemptionRepository,
  type RedemptionCustomer,
  type RedemptionWithCustomer,
} from '../domain/port/redemption.repository.js';
import { normalizarCodigo } from '../domain/redemption-code.js';
import { RedemptionsExpirationService } from './redemptions-expiration.service.js';

// §3.12.2: el contrato no cita el texto; decisión de Melisa
export const CUSTOMER_NOT_FOUND_MESSAGE = 'No existe el cliente.';

// §3.8.1 y §5: 404 sin code
export const CODE_NOT_FOUND_MESSAGE = 'Código no encontrado.';

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

type PageInput = {
  fromDate?: string;
  toDate?: string;
  order?: RedemptionOrder;
  page: number;
  limit: number;
};

export type ListMyRedemptionsInput = PageInput & {
  customerId: number;
  status?: RedemptionStatusGroup;
};

export type ListRedemptionsInput = PageInput & {
  documentType?: DocumentType;
  documentNumber?: string;
  code?: string;
  rewardName?: string;
  status?: RedemptionStatus;
};

export type UsableRedemptions = { redemptions: Redemption[]; customer: RedemptionCustomer | null };

// US-45 (contrato S4 §3.12): los tres listados de canjes. Cada uno "vence al leer" antes de
// consultar (CA-44.1), fuera de cualquier transacción, para que nadie vea Confirmado un canje vencido.
@Injectable()
export class RedemptionsQueryService {
  constructor(
    private readonly redemptionRepository: RedemptionRepository,
    private readonly expiration: RedemptionsExpirationService,
  ) {}

  // GET /canjes/:code (US-41, §3.8.1). Normaliza el código (§3.6.1): si no cumple el formato, es lo
  // mismo que no existir. Vence al leer (§3.11) antes de consultar, fuera de cualquier transacción,
  // y devuelve el canje completo en cualquier estado.
  async getByCode(rawCode: string, now: Date = new Date()): Promise<RedemptionWithCustomer> {
    const code = normalizarCodigo(rawCode);
    if (!code) throw new NotFoundException(CODE_NOT_FOUND_MESSAGE);

    await this.expiration.vencerVencidos({ code }, now);

    const redemption = await this.redemptionRepository.findByCode(code);
    if (!redemption) throw new NotFoundException(CODE_NOT_FOUND_MESSAGE);
    const customer = await this.redemptionRepository.findCustomer(redemption.getCustomerId());
    return { redemption, customer };
  }

  // GET /customers/me/canjes (§3.12.1)
  async listMine(input: ListMyRedemptionsInput, now: Date = new Date()): Promise<Paginated<Redemption>> {
    const range = buildRedemptionDateRange(input.fromDate, input.toDate);
    await this.expiration.vencerVencidos({ customerId: input.customerId }, now);

    const { items, total } = await this.redemptionRepository.findPageByCustomer(input.customerId, {
      statuses: statusesOfGroup(input.status),
      range,
      order: input.order ?? 'desc',
      page: input.page,
      limit: input.limit,
    });
    return { items, total, page: input.page, limit: input.limit };
  }

  // GET /customers/:id/canjes (§3.12.2, S4-10): solo los Confirmados vigentes. 404 si el cliente no
  // existe; dado de baja, lista vacía (sus canjes se rechazaron al darlo de baja).
  async listUsableNow(customerId: number, now: Date = new Date()): Promise<UsableRedemptions> {
    const status = await this.redemptionRepository.findCustomerStatus(customerId);
    if (!status) throw new NotFoundException(CUSTOMER_NOT_FOUND_MESSAGE);
    if (!status.isActive) return { redemptions: [], customer: null };

    await this.expiration.vencerVencidos({ customerId }, now);
    const redemptions = await this.redemptionRepository.findUsableByCustomer(customerId, now);
    const customer = redemptions.length > 0 ? await this.redemptionRepository.findCustomer(customerId) : null;
    return { redemptions, customer };
  }

  // GET /canjes (§3.12.3). documentType (DNI por defecto) solo se aplica si viene documentNumber.
  async listAll(input: ListRedemptionsInput, now: Date = new Date()): Promise<Paginated<RedemptionWithCustomer>> {
    const range = buildRedemptionDateRange(input.fromDate, input.toDate);
    const documentNumber = normalizeDocumentFilter(input.documentNumber);
    await this.expiration.vencerVencidos({ all: true }, now);

    const { items, total } = await this.redemptionRepository.findPage({
      status: input.status,
      document: documentNumber ? { type: input.documentType ?? 'DNI', number: documentNumber } : undefined,
      code: normalizeCodeFilter(input.code),
      rewardName: foldRewardNameFilter(input.rewardName),
      range,
      order: input.order ?? 'desc',
      page: input.page,
      limit: input.limit,
    });
    return { items, total, page: input.page, limit: input.limit };
  }
}
