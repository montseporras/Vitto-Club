// Pestaña Canjes del Cliente. Por ahora solo tiene Mis canjes (US-45); el Catálogo y el control
// "Catálogo / Mis canjes" del prototipo son de US-39.
import { MyRedemptions } from '../components/MyRedemptions'

export function MyRedemptionsPage() {
  // La ventana "Cancelar canje" es de US-43: cuando exista, se le pasa acá a `onCancel`
  return (
    <div className="mx-auto w-full max-w-xl">
      <MyRedemptions />
    </div>
  )
}
