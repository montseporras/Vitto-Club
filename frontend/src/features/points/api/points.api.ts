// Este archivo hace las llamadas al backend para leer y guardar la configuración de
// puntos. Lo usan los hooks de points.queries.ts; las pantallas no lo llaman directo.
import { toApiError } from '@/shared/api/ApiError';
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

// La equivalencia y la bonificación responden 404 mientras nadie las configuró.
// No es un error: se devuelve null y la pantalla muestra el formulario vacío.
async function getOrNullIfNotConfigured<T>(url: string): Promise<T | null> {
  try {
    const { data } = await http.get<T>(url);
    return data;
  } catch (error) {
    if (toApiError(error).status === 404) return null;
    throw error;
  }
}

// Traduce el formulario al cuerpo que espera la API (contrato del backend).
export function formToUpdateFirstPurchaseBonusDto(
  form: FirstPurchaseBonusFormValues,
): UpdateFirstPurchaseBonusDto {
  return {
    bonusType: form.bonusType,
    bonusValue: form.bonusValue,
  };
}

// Bonificación por primera compra configurada actualmente (RF-011), o null si
// todavía no se configuró.
export function getFirstPurchaseBonus(): Promise<FirstPurchaseBonus | null> {
  return getOrNullIfNotConfigured<FirstPurchaseBonus>(FIRST_PURCHASE_BONUS_URL);
}

// Guarda la bonificación (RF-011). El backend crea una versión nueva y conserva la anterior.
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
    pointsAwarded: form.pointsAwarded,
  };
}

// Equivalencia de puntos configurada actualmente (RF-09), o null si todavía no
// se configuró.
export function getPointsEquivalence(): Promise<PointsEquivalence | null> {
  return getOrNullIfNotConfigured<PointsEquivalence>(POINTS_EQUIVALENCE_URL);
}

// Guarda la equivalencia (RF-09). El backend crea una versión nueva y conserva la anterior.
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
    pointsExpirationMonths: form.pointsExpirationMonths,
  };
}

// Vigencia de los puntos configurada actualmente (RF-010). Si nadie la configuró,
// el backend responde el valor por defecto (12 meses).
export async function getPointsExpiration(): Promise<PointsExpiration> {
  const { data } = await http.get<PointsExpiration>(POINTS_EXPIRATION_URL);
  return data;
}

// Guarda la vigencia (RF-010). El backend crea una versión nueva y conserva la anterior.
export async function updatePointsExpiration(
  body: UpdatePointsExpirationDto,
): Promise<PointsExpiration> {
  const { data } = await http.put<PointsExpiration>(
    POINTS_EXPIRATION_URL,
    body,
  );
  return data;
}
