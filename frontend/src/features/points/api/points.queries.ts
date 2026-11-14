// Este archivo ofrece los hooks para leer y guardar la configuración de puntos.
// Conecta los formularios con las llamadas de points.api.ts y maneja carga, error y caché.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FirstConsumptionBonusFormValues } from '../schemas/first-consumption-bonus.schema';
import type { PointsEquivalenceFormValues } from '../schemas/points-equivalence.schema';
import type { PointsExpirationFormValues } from '../schemas/points-expiration.schema';
import {
  benefitToDto,
  type LoyaltyLevelsFormValues,
} from '../schemas/loyalty-levels.schema';
import type { FrequentCustomersFormValues } from '../schemas/frequent-customers.schema';
import {
  getFrequentCustomers,
  updateFrequentCustomers,
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
        bronzeBenefit: benefitToDto(form.bronzeBenefit),
        silverBenefit: benefitToDto(form.silverBenefit),
        goldBenefit: benefitToDto(form.goldBenefit),
      }),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.loyaltyLevels(), saved);
      // El beneficio también se ve en el Inicio del Cliente y en la ficha: quedan viejos
      void qc.invalidateQueries({ queryKey: ['customers'] });
      void qc.invalidateQueries({ queryKey: ['my-account'] });
    },
  });
};

// Mínimo de consumos de un cliente frecuente (US-51).
export const useFrequentCustomers = () =>
  useQuery({
    queryKey: pointsKeys.frequentCustomers(),
    queryFn: getFrequentCustomers,
  });

// Guarda el mínimo. Como cambia qué clientes son frecuentes, las estadísticas guardadas
// en caché quedan viejas: se invalidan.
export const useUpdateFrequentCustomers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FrequentCustomersFormValues) =>
      updateFrequentCustomers({ minConsumptions: form.minConsumptions }),
    onSuccess: (saved) => {
      qc.setQueryData(pointsKeys.frequentCustomers(), saved);
      void qc.invalidateQueries({ queryKey: ['statistics'] });
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
