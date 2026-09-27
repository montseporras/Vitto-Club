import { ComingSoon } from '@/shared/components/feedback/ComingSoon'

// TODO: buscar al cliente por documento (GET /api/customers/by-document).
export function IdentificarClientePage() {
  return (
    <ComingSoon
      eyebrow="Clientes"
      title="Cliente"
      description="Acá vas a poder buscar a un cliente por su documento para ver sus puntos y registrar la compra."
    />
  )
}
