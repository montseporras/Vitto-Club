// Este archivo ofrece los hooks para leer y guardar la configuración de puntos.
// Conecta los formularios con las llamadas de points.api.ts y maneja carga, error y caché.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FirstPurchaseBonusFormValues } from '../schemas/first-purchase-bonus.schema';
import type { PointsEquivalenceFormValues } from '../schemas/points-equivalence.schema';
import type { PointsExpirationFormValues } from '../schemas/points-expiration.schema';
import {
  formToUpdateFirstPurchaseBonusDto,
  formToUpdatePointsEquivalenceDto,
  formToUpdatePointsExpirationDto,
  getFirstPurchaseBonus,
  getPointsEquivalence,
  getPointsExpiration,
  updateFirstPurchaseBonus,
  updatePointsEquivalence,
  updatePointsExpiration,
} from './points.api';
import { pointsKeys } from './points.keys';

// Bonificación por primera compra configurada actualmente (RF-011).
export const useFirstPurchaseBonus = () =>
  useQuery({
    queryKey: pointsKeys.firstPurchaseBonus(),
    queryFn: getFirstPurchaseBonus,
  });

// Guarda la bonificación (RF-011). Recibe el formulario y lo traduce al DTO del backend.
// La respuesta ya es la configuración guardada: se escribe directo en la caché.
export const useUpdateFirstPurchaseBonus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FirstPurchaseBonusFormValues) =>
      updateFirstPurchaseBonus(formToUpdateFirstPurchaseBonusDto(form)),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.firstPurchaseBonus(), saved);
    },
  });
};

// Equivalencia de puntos configurada actualmente (RF-09).
export const usePointsEquivalence = () =>
  useQuery({
    queryKey: pointsKeys.equivalence(),
    queryFn: getPointsEquivalence,
  });

// Guarda la equivalencia (RF-09). Recibe el formulario y lo traduce al DTO del backend.
// La respuesta ya es la configuración guardada: se escribe directo en la caché.
export const useUpdatePointsEquivalence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: PointsEquivalenceFormValues) =>
      updatePointsEquivalence(formToUpdatePointsEquivalenceDto(form)),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.equivalence(), saved);
    },
  });
};

// Vigencia de los puntos configurada actualmente (RF-010).
export const usePointsExpiration = () =>
  useQuery({
    queryKey: pointsKeys.expiration(),
    queryFn: getPointsExpiration,
  });

// Guarda la vigencia (RF-010). Recibe el formulario y lo traduce al DTO del backend.
// La respuesta ya es la configuración guardada: se escribe directo en la caché.
export const useUpdatePointsExpiration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: PointsExpirationFormValues) =>
      updatePointsExpiration(formToUpdatePointsExpirationDto(form)),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.expiration(), saved);
    },
  });
};
