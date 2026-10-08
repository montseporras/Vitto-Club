// Este archivo hace las llamadas al backend para leer y guardar la configuración de
// puntos. Lo usan los hooks de points.queries.ts; las pantallas no lo llaman directo.
import { http } from '@/shared/api/http';
import type { FirstPurchaseBonusFormValues } from '../schemas/first-purchase-bonus.schema';
import type { PointsEquivalenceFormValues } from '../schemas/points-equivalence.schema';
import type { PointsExpirationFormValues } from '../schemas/points-expiration.schema';
import type {
  FirstPurchaseBonus,
  UpdateFirstPurchaseBonusDto,
} from '../types/first-purchase-bonus';
import type {
  PointsEquivalence,
  UpdatePointsEquivalenceDto,
} from '../types/points-equivalence';
import type {
  PointsExpiration,
  UpdatePointsExpirationDto,
} from '../types/points-expiration';

const FIRST_PURCHASE_BONUS_URL = '/settings/first-purchase-bonus';
const POINTS_EQUIVALENCE_URL = '/settings/points-equivalence';
const POINTS_EXPIRATION_URL = '/settings/points-expiration';

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

// Traduce el formulario al cuerpo que espera la API (contrato del backend).
export function formToUpdatePointsEquivalenceDto(
  form: PointsEquivalenceFormValues,
): UpdatePointsEquivalenceDto {
  return {
    baseAmount: form.baseAmount,
    points: form.points,
  };
}

// Equivalencia de puntos configurada actualmente (RF-09).
export async function getPointsEquivalence(): Promise<PointsEquivalence> {
  const { data } = await http.get<PointsEquivalence>(POINTS_EQUIVALENCE_URL);
  return data;
}

// Guarda la equivalencia (RF-09). La configuración es única: se reemplaza completa.
export async function updatePointsEquivalence(
  body: UpdatePointsEquivalenceDto,
): Promise<PointsEquivalence> {
  const { data } = await http.put<PointsEquivalence>(
    POINTS_EQUIVALENCE_URL,
    body,
  );
  return data;
}

// Traduce el formulario al cuerpo que espera la API (contrato del backend).
export function formToUpdatePointsExpirationDto(
  form: PointsExpirationFormValues,
): UpdatePointsExpirationDto {
  return {
    months: form.months,
  };
}

// Vigencia de los puntos configurada actualmente (RF-010).
export async function getPointsExpiration(): Promise<PointsExpiration> {
  const { data } = await http.get<PointsExpiration>(POINTS_EXPIRATION_URL);
  return data;
}

// Guarda la vigencia (RF-010). La configuración es única: se reemplaza completa.
export async function updatePointsExpiration(
  body: UpdatePointsExpirationDto,
): Promise<PointsExpiration> {
  const { data } = await http.put<PointsExpiration>(
    POINTS_EXPIRATION_URL,
    body,
  );
  return data;
}