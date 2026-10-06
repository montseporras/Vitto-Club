// Llamadas crudas al backend para el feature empleados.
import { http } from '@/shared/api/http';
import type {
  EditEmployeeFormValues,
  CreateEmployeeFormValues,
} from '../schemas/employee.schema';
import type {
  Account,
  UpdateEmployeeDto,
  CreateAccountDto,
  CreateEmployeeDto,
  Employee,
  UpdateAccountPasswordDto,
} from '../types/employee';

// Traduce el formulario al cuerpo que espera la API (contrato del backend).
export function formToCreateEmployeeDto(
  form: CreateEmployeeFormValues,
): CreateEmployeeDto {
  const phone = form.phone?.trim();
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: phone ? phone : undefined,
    email: form.email.trim(),
    role: form.role,
  };
}

// Listado de empleados (RF-03). La búsqueda por nombre y/o apellido la resuelve
// el backend (?name=); sin `name` devuelve todos, activos e inactivos.
export async function listEmployees(name?: string): Promise<Employee[]> {
  const trimmed = name?.trim();
  const { data } = await http.get<Employee[]>('/empleados', {
    params: trimmed ? { name: trimmed } : undefined,
  });
  return data;
}

export async function createEmployee(
  body: CreateEmployeeDto,
): Promise<Employee> {
  const { data } = await http.post<Employee>('/empleados', body);
  return data;
}

// Baja lógica de un empleado (RF-04): el backend marca isActive=false,
// no borra el registro.
export async function deactivateEmployee(id: number): Promise<Employee> {
  const { data } = await http.delete<Employee>(`/empleados/${id}`);
  return data;
}

// Traduce el formulario de edición al cuerpo que espera la API (RF-02).
export function formToUpdateEmployeeDto(
  form: EditEmployeeFormValues,
): UpdateEmployeeDto {
  const phone = form.phone?.trim();
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: phone ? phone : undefined,
    role: form.role,
  };
}

// Edición de empleado (RF-02). El mail no se edita.
export async function updateEmployee(
  id: number,
  body: UpdateEmployeeDto,
): Promise<Employee> {
  const { data } = await http.patch<Employee>(`/empleados/${id}`, body);
  return data;
}

// Alta del usuario de un empleado (SCRUM-21): con este usuario entra al sistema.
export async function createEmployeeAccount(
  body: CreateAccountDto,
): Promise<Account> {
  const { data } = await http.post<Account>('/usuarios', body);
  return data;
}

// Usuario de un empleado (SCRUM-24). Responde 404 si el empleado no tiene.
export async function getEmployeeAccount(employeeId: number): Promise<Account> {
  const { data } = await http.get<Account>(`/usuarios/empleado/${employeeId}`);
  return data;
}

// Cambio de contraseña del usuario (SCRUM-24).
export async function updateAccountPassword(
  accountId: number,
  body: UpdateAccountPasswordDto,
): Promise<Account> {
  const { data } = await http.patch<Account>(`/usuarios/${accountId}`, body);
  return data;
}
