// Hooks de datos del feature empleados (TanStack Query).
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  EditEmployeeFormValues,
  CreateEmployeeFormValues,
} from '../schemas/employee.schema';
import type { CreateAccountDto } from '../types/employee';
import {
  updateEmployee,
  createEmployeeAccount,
  deactivateEmployee,
  formToUpdateEmployeeDto,
  formToCreateEmployeeDto,
  listEmployees,
  createEmployee,
} from './employees.api';
import { employeesKeys } from './employees.keys';

// Listado de empleados, filtrado por nombre y/o apellido en el backend (RF-03).
// Mientras llega una búsqueda nueva se sigue mostrando el resultado anterior.
export const useEmployees = (name = '') =>
  useQuery({
    queryKey: employeesKeys.list(name),
    queryFn: () => listEmployees(name),
    placeholderData: keepPreviousData,
  });

// Alta de empleado (RF-01). Recibe el formulario y lo traduce al DTO del backend.
export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: CreateEmployeeFormValues) =>
      createEmployee(formToCreateEmployeeDto(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
};

// Edición de empleado (RF-02). Recibe el formulario y lo traduce al DTO del backend.
// Se refresca el listado también si falla: un 404/409 significa que la tabla
// estaba desactualizada.
export const useUpdateEmployee = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: EditEmployeeFormValues) =>
      updateEmployee(id, formToUpdateEmployeeDto(form)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
};

// Baja de empleado (RF-04): baja lógica, no elimina el registro.
export const useDeactivateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivateEmployee(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
};

// Alta del usuario de un empleado (SCRUM-21). Refresca la tabla para que el
// empleado aparezca con usuario.
export const useCreateEmployeeAccount = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAccountDto) => createEmployeeAccount(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeesKeys.lists() });
    },
  });
};
