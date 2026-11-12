import { createContext } from 'react'

/** 'compact' = tarjetas de Configuración → Puntos (prototipo: .vc-pts). */
export const CardDensityContext = createContext<'default' | 'compact'>('default')
