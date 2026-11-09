import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CUSTOMER_DEACTIVATED,
  REWARD_DEACTIVATED,
  REWARD_DELETED,
  type CustomerDeactivatedEvent,
  type RedemptionsRejectedResult,
  type RewardDeactivatedEvent,
  type RewardDeletedEvent,
} from '../../shared/events/domain-events.js';
import {
  AUTOMATIC_REJECTION_REASONS,
  RedemptionResolutionService,
} from './redemption-resolution.service.js';

// US-43 (contrato S4 §3.10.4 y §8.4): rechazo automático de los canjes Confirmados. rewards y
// customers no importan redemptions: publican el evento dentro de su transacción y acá se rechaza.
// suppressErrors: false → si el rechazo falla, el error llega a quien publicó y se deshace todo.
// Devuelve cuántos rechazó: quien publica lo lee del resultado de emitAsync (rejectedRedemptions).
@Injectable()
export class RedemptionEventsListener {
  constructor(private readonly resolution: RedemptionResolutionService) {}

  // US-36: desactivar recompensa
  @OnEvent(REWARD_DEACTIVATED, { suppressErrors: false })
  async onRewardDeactivated(event: RewardDeactivatedEvent): Promise<RedemptionsRejectedResult> {
    return await this.reject({ rewardId: event.rewardId }, AUTOMATIC_REJECTION_REASONS.rewardDeactivated);
  }

  // US-38: eliminar recompensa
  @OnEvent(REWARD_DELETED, { suppressErrors: false })
  async onRewardDeleted(event: RewardDeletedEvent): Promise<RedemptionsRejectedResult> {
    return await this.reject({ rewardId: event.rewardId }, AUTOMATIC_REJECTION_REASONS.rewardDeleted);
  }

  // §3.13.1: dar de baja un cliente
  @OnEvent(CUSTOMER_DEACTIVATED, { suppressErrors: false })
  async onCustomerDeactivated(event: CustomerDeactivatedEvent): Promise<RedemptionsRejectedResult> {
    return await this.reject(
      { customerId: event.customerId },
      AUTOMATIC_REJECTION_REASONS.customerDeactivated,
    );
  }

  private async reject(
    filter: { rewardId: number } | { customerId: number },
    reason: string,
  ): Promise<RedemptionsRejectedResult> {
    return { rejectedRedemptions: await this.resolution.rechazarConfirmados(filter, reason) };
  }
}
