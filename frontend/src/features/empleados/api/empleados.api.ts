// Llamadas crudas al backend para el feature empleados.
import { http } from '@/shared/api/http';
import type { RegistrarEmpleadoForm } from '../schemas/empleado.schema';
import type { CrearEmpleadoDto, Empleado } from '../types/empleado';

// Traduce el formulario (español) al cuerpo que espera la API (contrato del backend).
export function formACrearEmpleadoDto(
  form: RegistrarEmpleadoForm,
): CrearEmpleadoDto {
  const telefono = form.telefono?.trim();
  return {
    firstName: form.nombre.trim(),
    lastName: form.apellido.trim(),
    phone: telefono ? telefono : undefined,
    email: form.email.trim(),
    role: form.rol,
  };
}

export async function listarEmpleados(): Promise<Empleado[]> {
  const { data } = await http.get<Empleado[]>('/empleados');
  return data;
}

export async function registrarEmpleado(
  body: CrearEmpleadoDto,
): Promise<Empleado> {
  const { data } = await http.post<Empleado>('/empleados', body);
  return data;
}
