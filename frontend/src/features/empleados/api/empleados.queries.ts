// Hooks de datos del feature empleados (TanStack Query).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EditarEmpleadoForm,
  RegistrarEmpleadoForm,
} from '../schemas/empleado.schema';
import {
  actualizarEmpleado,
  darDeBajaEmpleado,
  formAActualizarEmpleadoDto,
  formACrearEmpleadoDto,
  listarEmpleados,
  registrarEmpleado,
} from './empleados.api';
import { empleadosKeys } from './empleados.keys';

// Listado de empleados registrados (Consultar / tabla de RF-01).
export const useEmpleados = () =>
  useQuery({
    queryKey: empleadosKeys.lists(),
    queryFn: listarEmpleados,
  });

// Alta de empleado (RF-01). Recibe el formulario y lo traduce al DTO del backend.
export const useRegistrarEmpleado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: RegistrarEmpleadoForm) =>
      registrarEmpleado(formACrearEmpleadoDto(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: empleadosKeys.lists() });
    },
  });
};

// Edición de empleado (RF-02). Recibe el formulario y lo traduce al DTO del backend.
export const useActualizarEmpleado = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: EditarEmpleadoForm) =>
      actualizarEmpleado(id, formAActualizarEmpleadoDto(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: empleadosKeys.lists() });
    },
  });
};

// Baja de empleado: baja lógica, no elimina el registro.
export const useDarDeBajaEmpleado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => darDeBajaEmpleado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: empleadosKeys.lists() });
    },
  });
};
