// Buscador de empleados por nombre o apellido (RF-03).
interface BuscadorEmpleadosProps {
  valor: string;
  onCambiar: (valor: string) => void;
}

export function BuscadorEmpleados({ valor, onCambiar }: BuscadorEmpleadosProps) {
  return (
    <div>
      <label className="sr-only" htmlFor="busqueda-empleados">
        Buscar empleado
      </label>
      <input
        id="busqueda-empleados"
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Buscar por nombre o apellido…"
        className="w-full max-w-sm rounded border border-[var(--border)] bg-white px-3 py-2 text-[var(--text-heading)] outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
      />
    </div>
  );
}
