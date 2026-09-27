// Buscador de empleados por nombre o apellido (RF-03).
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';

interface BuscadorEmpleadosProps {
  valor: string;
  onCambiar: (valor: string) => void;
}

export function BuscadorEmpleados({ valor, onCambiar }: BuscadorEmpleadosProps) {
  return (
    <div>
      <Label className="sr-only" htmlFor="busqueda-empleados">
        Buscar empleado
      </Label>
      <Input
        id="busqueda-empleados"
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Buscar por nombre o apellido…"
        autoComplete="off"
        className="max-w-sm"
      />
    </div>
  );
}
