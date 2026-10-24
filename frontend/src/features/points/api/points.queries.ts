// Este archivo ofrece los hooks para leer y guardar la configuración de puntos.
// Conecta los formularios con las llamadas de points.api.ts y maneja carga, error y caché.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FirstConsumptionBonusFormValues } from '../schemas/first-consumption-bonus.schema';
import type { PointsEquivalenceFormValues } from '../schemas/points-equivalence.schema';
import type { PointsExpirationFormValues } from '../schemas/points-expiration.schema';
import type { LoyaltyLevelsFormValues } from '../schemas/loyalty-levels.schema';
import {
  formToUpdateFirstConsumptionBonusDto,
  formToUpdatePointsEquivalenceDto,
  formToUpdatePointsExpirationDto,
  getFirstConsumptionBonus,
  getLoyaltyLevels,
  getPointsEquivalence,
  getPointsExpiration,
  updateFirstConsumptionBonus,
  updateLoyaltyLevels,
  updatePointsEquivalence,
  updatePointsExpiration,
} from './points.api';
import { pointsKeys } from './points.keys';

// Bonificación por primer consumo configurada actualmente (RF-011).
export const useFirstConsumptionBonus = () =>
  useQuery({
    queryKey: pointsKeys.firstConsumptionBonus(),
    queryFn: getFirstConsumptionBonus,
  });

// Guarda la bonificación (RF-011). Recibe el formulario y lo traduce al DTO del backend.
// La respuesta ya es la configuración guardada: se escribe directo en la caché.
export const useUpdateFirstConsumptionBonus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FirstConsumptionBonusFormValues) =>
      updateFirstConsumptionBonus(formToUpdateFirstConsumptionBonusDto(form)),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.firstConsumptionBonus(), saved);
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

export const useLoyaltyLevels = () =>
  useQuery({
    queryKey: pointsKeys.loyaltyLevels(),
    queryFn: getLoyaltyLevels,
  });

export const useUpdateLoyaltyLevels = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: LoyaltyLevelsFormValues) =>
      updateLoyaltyLevels({
        silverMinPoints: form.silverMinPoints,
        goldMinPoints: form.goldMinPoints,
      }),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.loyaltyLevels(), saved);
    },
  });
};

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
