// Utilidades para descarga de archivos desde la API.
//
// `downloadFile` pide un archivo con la misma instancia de Axios que el resto de la app (lleva el
// token y renueva la sesión si hace falta) y lo baja con el nombre que manda el backend en
// `Content-Disposition`. Si el navegador no deja leer ese encabezado (por ejemplo, si la API
// quedara en otro dominio), usa `fallbackName`.
import { http } from './http'

type DownloadOptions = {
  params?: Record<string, string | number | boolean>
  /** Nombre del archivo si la respuesta no trae uno. */
  fallbackName: string
}

const BACKSLASH = String.fromCharCode(92)

/** Solo el nombre: lo que viene después de la última barra o barra invertida (sin carpetas). */
function baseName(path: string): string {
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf(BACKSLASH))
  return path.slice(cut + 1).trim()
}

/** Nombre de archivo de un `Content-Disposition: attachment; filename="…"`, o null. */
function filenameFromDisposition(header: string | undefined): string | null {
  if (!header) return null
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  const raw = encoded?.[1] ?? plain?.[1]
  if (!raw) return null
  try {
    // Solo el nombre: sin carpetas
    return baseName(decodeURIComponent(raw)) || null
  } catch {
    return baseName(raw) || null
  }
}

/** Baja un archivo de la API y lo guarda con el nombre del backend. */
export async function downloadFile(url: string, { params, fallbackName }: DownloadOptions) {
  const response = await http.get<Blob>(url, { params, responseType: 'blob' })
  const filename =
    filenameFromDisposition(response.headers['content-disposition'] as string | undefined) ??
    fallbackName

  const objectUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
