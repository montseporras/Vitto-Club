// Llamadas crudas al backend para el feature empleados.
import { http } from '@/shared/api/http';
import type {
  EditarEmpleadoForm,
  RegistrarEmpleadoForm,
} from '../schemas/empleado.schema';
import type {
  ActualizarEmpleadoDto,
  CrearEmpleadoDto,
  Empleado,
} from '../types/empleado';

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

// Baja lógica de un empleado (RF-04): el backend marca isActive=false,
// no borra el registro.
export async function darDeBajaEmpleado(id: number): Promise<Empleado> {
  const { data } = await http.delete<Empleado>(`/empleados/${id}`);
  return data;
}

// Traduce el formulario de edición al cuerpo que espera la API (RF-02).
export function formAActualizarEmpleadoDto(
  form: EditarEmpleadoForm,
): ActualizarEmpleadoDto {
  const telefono = form.telefono?.trim();
  return {
    firstName: form.nombre.trim(),
    lastName: form.apellido.trim(),
    phone: telefono ? telefono : undefined,
    role: form.rol,
  };
}

// Edición de empleado (RF-02). El mail no se edita.
export async function actualizarEmpleado(
  id: number,
  body: ActualizarEmpleadoDto,
): Promise<Empleado> {
  const { data } = await http.patch<Empleado>(`/empleados/${id}`, body);
  return data;
}
