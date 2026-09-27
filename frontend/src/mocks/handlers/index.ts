import { cajaHandlers } from './caja.handlers'
import { empleadosHandlers } from './empleados'

export const handlers = [...cajaHandlers, ...empleadosHandlers]
