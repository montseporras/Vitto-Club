import { ConfigService } from '@nestjs/config';

// BASE-5 (contrato S5 §3.8.3): NOTIFICATIONS_EMAIL_ENABLED=true manda los correos con Resend; con false
// (desarrollo y e2e) o sin la variable no se manda nada, se registra SKIPPED y queda en el log. Solo se
// prende con "true", así una variable que falta nunca hace que se llame a un servicio externo por
// accidente.
export function isEmailSendingEnabled(config: ConfigService): boolean {
  return config.get<string>('NOTIFICATIONS_EMAIL_ENABLED')?.trim().toLowerCase() === 'true';
}

export type ResendConfig = { apiKey: string; from: string };

const REQUIRED = [
  ['apiKey', 'RESEND_API_KEY'],
  ['from', 'NOTIFICATIONS_FROM'],
] as const;

// Con el envío prendido, las dos variables son obligatorias: si falta alguna, el servidor no arranca y
// dice cuál (mejor que fallar recién cuando hay que mandar un correo)
export function readResendConfig(config: ConfigService): ResendConfig {
  const values = Object.fromEntries(REQUIRED.map(([key, name]) => [key, config.get<string>(name)?.trim()]));
  const missing = REQUIRED.filter(([key]) => !values[key]).map(([, name]) => name);
  if (missing.length > 0) {
    throw new Error(`NOTIFICATIONS_EMAIL_ENABLED=true pero faltan variables de Resend: ${missing.join(', ')}`);
  }
  return values as ResendConfig;
}
