// Promociones del local que se muestran en el carrusel del Inicio y en su detalle.
//
// El contrato no tiene un endpoint de promociones para la app: las promociones de Notificaciones
// solo se mandan por correo y no se guardan (S5-36). Por eso estas son fijas: las propuestas
// estables de La Vitto (pizza libre los viernes y merienda buffet los domingos). Si el equipo suma
// un endpoint, este archivo se reemplaza por la llamada.
import { ICONS } from '@/shared/components/ui/icons'

export type LocalPromotion = {
  slug: string
  /** Etiqueta chica de arriba */
  tag: string
  title: string
  description: string
  /** Ícono de la ilustración */
  icon: string
  /** Líneas de detalle con su ícono */
  details: { icon: string; text: string }[]
}

export const LOCAL_PROMOTIONS: LocalPromotion[] = [
  {
    slug: 'pizza-libre',
    tag: '¡Promo especial!',
    title: 'Pizza libre',
    description: 'Comé todas las pizzas que quieras. Te esperamos todos los viernes.',
    icon: ICONS.pizza,
    details: [
      { icon: ICONS.calendar, text: 'Viernes' },
      { icon: ICONS.coins, text: 'Tu consumo suma puntos' },
      { icon: ICONS.info, text: 'Válido para consumo en el local' },
    ],
  },
  {
    slug: 'merienda-buffet',
    tag: '¡Promo especial!',
    title: 'Merienda buffet',
    description: 'Dulces, salados y bebidas calientes para compartir. Todos los domingos.',
    icon: ICONS.cup,
    details: [
      { icon: ICONS.calendar, text: 'Domingos' },
      { icon: ICONS.coins, text: 'Tu consumo suma puntos' },
      { icon: ICONS.info, text: 'Válido para consumo en el local' },
    ],
  },
]

export const findPromotion = (slug: string | undefined) =>
  LOCAL_PROMOTIONS.find((promotion) => promotion.slug === slug)
