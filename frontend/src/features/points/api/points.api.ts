// Este archivo hace las llamadas al backend para leer y guardar la bonificación por
// primera compra. Lo usan los hooks de points.queries.ts; las pantallas no lo llaman directo.
import { http } from '@/shared/api/http';
import type { FirstPurchaseBonusFormValues } from '../schemas/first-purchase-bonus.schema';
import type {
  FirstPurchaseBonus,
  UpdateFirstPurchaseBonusDto,
} from '../types/first-purchase-bonus';

const FIRST_PURCHASE_BONUS_URL = '/settings/first-purchase-bonus';

// Traduce el formulario al cuerpo que espera la API (contrato del backend).
export function formToUpdateFirstPurchaseBonusDto(
  form: FirstPurchaseBonusFormValues,
): UpdateFirstPurchaseBonusDto {
  return {
    type: form.type,
    value: form.value,
  };
}

// Bonificación por primera compra configurada actualmente (RF-011).
export async function getFirstPurchaseBonus(): Promise<FirstPurchaseBonus> {
  const { data } = await http.get<FirstPurchaseBonus>(FIRST_PURCHASE_BONUS_URL);
  return data;
}

// Guarda la bonificación (RF-011). La configuración es única: se reemplaza completa.
export async function updateFirstPurchaseBonus(
  body: UpdateFirstPurchaseBonusDto,
): Promise<FirstPurchaseBonus> {
  const { data } = await http.put<FirstPurchaseBonus>(
    FIRST_PURCHASE_BONUS_URL,
    body,
  );
  return data;
}