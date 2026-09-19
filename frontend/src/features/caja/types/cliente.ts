import type { TipoDocumento } from '@/domain/documentos'

/** Cliente tal como lo devuelve POST /api/clientes. */
export type Cliente = {
  id: number
  nombre: string
  apellido: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  telefono: string | null
  email: string
  fechaNacimiento: string | null
  activo: boolean
  creadoEn: string
}

/** Body de POST /api/clientes (RF-015). */
export type RegistrarClienteDTO = {
  nombre: string
  apellido: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  email: string
  telefono?: string
}
