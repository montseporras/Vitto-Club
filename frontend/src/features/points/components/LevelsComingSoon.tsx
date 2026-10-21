// Bloque "Niveles" de la sección Puntos (prototipo v2). Todavía no está
// construido: solo muestra el título y el cartel "Próximamente".
import { Card, CardTitle } from '@/shared/components/ui/Card';

export function LevelsComingSoon() {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <CardTitle>Niveles</CardTitle>
        <span className="inline-block rounded-full bg-beige px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
          Próximamente
        </span>
      </div>
    </Card>
  );
}
