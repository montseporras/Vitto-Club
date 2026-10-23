import type { Level } from '../../../points/domain/level.js';
import type { CustomerListItem } from '../../domain/port/customer.repository.js';
import { CustomerResponseDto } from './customer-response.dto.js';

// Ítem de GET /customers (contrato §3.8.1): todo lo que ya traía el cliente, más el saldo, los
// puntos acumulados y el nivel calculado.
export type CustomerListItemResponseDto = CustomerResponseDto & {
  balance: number;
  lifetimePoints: number;
  level: Level;
};

export const CustomerListItemResponseDto = {
  fromListItem(item: CustomerListItem): CustomerListItemResponseDto {
    return {
      ...CustomerResponseDto.fromDomain(item.customer),
      balance: item.balance,
      lifetimePoints: item.lifetimePoints,
      level: item.level,
    };
  },
};
