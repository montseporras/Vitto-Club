// Buscador de empleados por nombre o apellido (RF-03).
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';

interface EmployeeSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function EmployeeSearch({ value, onChange }: EmployeeSearchProps) {
  return (
    <div>
      <Label className="sr-only" htmlFor="employee-search">
        Buscar empleado
      </Label>
      <Input
        id="employee-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nombre o apellido…"
        autoComplete="off"
        className="max-w-sm"
      />
    </div>
  );
}
