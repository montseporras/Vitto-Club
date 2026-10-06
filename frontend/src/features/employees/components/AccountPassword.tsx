// Piezas compartidas por el alta del usuario (SCRUM-21) y el cambio de
// contraseña (SCRUM-24): el campo de contraseña generada y la pantalla final
// que muestra las credenciales una única vez.
import { useState, type ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Input } from '@/shared/components/ui/Input';

interface PasswordFieldProps {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn<'password'>;
  onRegenerate: () => void;
  getPassword: () => string;
}

// Contraseña generada y editable, con botones para generar otra y copiarla.
export function PasswordField({
  label,
  error,
  registration,
  onRegenerate,
  getPassword,
}: PasswordFieldProps) {
  return (
    <FormField
      id="password"
      label={label}
      error={error}
      hint="Mínimo 8 caracteres, con una mayúscula, un número y un carácter especial."
    >
      <div className="flex gap-2">
        <Input
          id="password"
          autoComplete="new-password"
          spellCheck={false}
          className="font-mono"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'password-error' : 'password-hint'}
          {...registration}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onRegenerate}
          aria-label="Generar otra contraseña"
          title="Generar otra contraseña"
          className="h-auto shrink-0"
        >
          <Icon d={ICONS.reload} className="size-4" />
        </Button>
        <CopyButton text={getPassword} />
      </div>
    </FormField>
  );
}

interface IssuedCredentialsProps {
  email: string;
  password: string;
  // Mensaje de éxito, arriba de las credenciales
  children: ReactNode;
  onDone: () => void;
}

// Credenciales recién emitidas: se muestran una sola vez para pasárselas al
// empleado, porque el backend nunca devuelve la contraseña.
export function IssuedCredentials({
  email,
  password,
  children,
  onDone,
}: IssuedCredentialsProps) {
  return (
    <div>
      <Alert variant="success" className="mb-6">
        {children}
      </Alert>

      <FormSection step={1} title="Datos de acceso">
        <FormField id="usuario-emitido" label="Usuario">
          <Input id="usuario-emitido" value={email} readOnly />
        </FormField>

        <FormField
          id="password-emitida"
          label="Contraseña"
          hint="Pasásela al empleado ahora: después no se vuelve a mostrar."
        >
          <div className="flex gap-2">
            <Input
              id="password-emitida"
              value={password}
              readOnly
              className="font-mono"
              aria-describedby="password-emitida-hint"
            />
            <CopyButton text={password} />
          </div>
        </FormField>
      </FormSection>

      <FormActions>
        <Button type="button" size="lg" onClick={onDone}>
          Listo
        </Button>
      </FormActions>
    </div>
  );
}

// Copia la contraseña al portapapeles y avisa unos segundos que se copió.
// El portapapeles solo existe en contextos seguros (https o localhost).
function CopyButton({ text }: { text: string | (() => string) }) {
  const [copied, setCopied] = useState(false);

  if (!navigator.clipboard) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(
      typeof text === 'function' ? text() : text,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => void copy()}
      aria-label="Copiar contraseña"
      title="Copiar contraseña"
      className="h-auto shrink-0"
    >
      <Icon d={copied ? ICONS.check : ICONS.copy} className="size-4" />
      <span aria-live="polite" className="sr-only">
        {copied ? 'Contraseña copiada' : ''}
      </span>
    </Button>
  );
}
