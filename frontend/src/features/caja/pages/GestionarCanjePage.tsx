import { ComingSoon } from '@/shared/components/feedback/ComingSoon'

// TODO: validar el código de canje y confirmarlo o rechazarlo.
export function GestionarCanjePage() {
  return (
    <ComingSoon
      eyebrow="Canjes"
      title="Gestionar canje por código"
      description="Acá vas a poder ingresar el código que presenta el cliente para aplicar o rechazar su canje."
    />
  )
}
