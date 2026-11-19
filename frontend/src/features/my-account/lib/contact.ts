// Contacto directo con La Vitto por WhatsApp: consultas y reservas. El mensaje sale escrito con el
// nombre del cliente y termina en "…" para que complete lo que necesita.
export const WHATSAPP_NUMBER = '5493525432574'

export function whatsappUrl(firstName?: string | null) {
  const name = firstName?.trim()
  const message = name ? `Hola, soy ${name} y me gustaría...` : 'Hola, me gustaría...'
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
