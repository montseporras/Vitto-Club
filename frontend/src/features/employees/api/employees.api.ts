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
  EmployeeResponse,
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
// A cada empleado se le suma el resumen de su usuario, que sale de GET /usuarios
// (SCRUM-27): el módulo de empleados del backend no conoce a las cuentas.
export async function listEmployees(name?: string): Promise<Employee[]> {
  const trimmed = name?.trim();
  const [{ data: employees }, { data: accounts }] = await Promise.all([
    http.get<EmployeeResponse[]>('/empleados', {
      params: trimmed ? { name: trimmed } : undefined,
    }),
    http.get<Account[]>('/usuarios'),
  ]);
  const accountByEmployee = new Map(accounts.map((a) => [a.employeeId, a]));
  return employees.map((employee) => {
    const account = accountByEmployee.get(employee.id);
    return {
      ...employee,
      account: account ? { id: account.accountId, active: account.active } : null,
    };
  });
}

export async function createEmployee(
  body: CreateEmployeeDto,
): Promise<EmployeeResponse> {
  const { data } = await http.post<EmployeeResponse>('/empleados', body);
  return data;
}

// Baja lógica de un empleado (RF-04): el backend marca isActive=false,
// no borra el registro.
export async function deactivateEmployee(id: number): Promise<EmployeeResponse> {
  const { data } = await http.delete<EmployeeResponse>(`/empleados/${id}`);
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
): Promise<EmployeeResponse> {
  const { data } = await http.patch<EmployeeResponse>(`/empleados/${id}`, body);
  return data;
}

// Alta del usuario de un empleado (SCRUM-21): con este usuario entra al sistema.
export async function createEmployeeAccount(
  body: CreateAccountDto,
): Promise<Account> {
  const { data } = await http.post<Account>('/usuarios', body);
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

// Baja lógica del usuario (SCRUM-27): no puede ingresar más y se cierran sus
// sesiones. El empleado sigue activo.
export async function deactivateAccount(accountId: number): Promise<void> {
  await http.patch(`/usuarios/${accountId}/deactivate`);
}

// Reactivación del usuario dado de baja (SCRUM-27). La contraseña sigue
// siendo la que tenía.
export async function reactivateAccount(accountId: number): Promise<void> {
  await http.patch(`/usuarios/${accountId}/reactivate`);
}
