// Este archivo ofrece los hooks para leer y guardar la bonificación por primera compra.
// Conecta el formulario con las llamadas de points.api.ts y maneja carga, error y caché.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FirstPurchaseBonusFormValues } from '../schemas/first-purchase-bonus.schema';
import {
  formToUpdateFirstPurchaseBonusDto,
  getFirstPurchaseBonus,
  updateFirstPurchaseBonus,
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