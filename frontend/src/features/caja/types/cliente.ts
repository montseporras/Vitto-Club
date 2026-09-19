import type { DocumentType } from '@/domain/documents'

/** Cliente tal como lo devuelve POST /api/clientes. */
export type Client = {
  id: number
  nombre: string
  apellido: string
  tipoDocumento: DocumentType
  numeroDocumento: string
  telefono: string | null
  email: string
  fechaNacimiento: string | null
  fotoUrl: string | null
  activo: boolean
  creadoEn: string
}

/** Body de POST /api/clientes (RF-015). Las claves son las del backend. */
export type CreateClientBody = {
  nombre: string
  apellido: string
  tipoDocumento: DocumentType
  numeroDocumento: string
  email: string
  telefono?: string
  /** 'YYYY-MM-DD'. La columna existe en la base; falta en el DTO del backend. */
  fechaNacimiento?: string
  /**
   * PROVISORIO: data URL en base64.
   * El backend todavía no guarda fotos y falta definir dónde se almacenan
   * (punto 02 del documento de estructura). Cuando se defina el servicio,
   * esto pasa a ser una subida aparte y acá viaja solo la URL.
   */
  foto?: string
}
