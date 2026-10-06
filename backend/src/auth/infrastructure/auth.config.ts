import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthRole } from '../domain/auth-role.js';
import { SessionPolicies, SessionPolicy } from '../domain/port/session-policies.js';

const MIN_SECRET_LENGTH = 32;

// Valores por defecto: los acordados para el proyecto (ver .env.example)
const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;
const DEFAULT_EMPLOYEE_INACTIVITY_SECONDS = 30 * 60;
const DEFAULT_EMPLOYEE_ABSOLUTE_SECONDS = 12 * 60 * 60;
const DEFAULT_CUSTOMER_INACTIVITY_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_CUSTOMER_ABSOLUTE_SECONDS = 30 * 24 * 60 * 60;

function positiveSeconds(config: ConfigService, name: string, fallback: number): number {
  const raw = config.get<string>(name);
  if (raw === undefined || raw === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer number of seconds`);
  }
  return value;
}

// Configuración de auth, leída y validada una sola vez al arrancar: si falta el secreto o
// un valor es inválido, la aplicación no levanta.
@Injectable()
export class AuthConfig implements SessionPolicies {
  readonly jwtSecret: string;
  readonly accessTokenTtlSeconds: number;
  private readonly employeePolicy: SessionPolicy;
  private readonly customerPolicy: SessionPolicy;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET is required and must have at least ${MIN_SECRET_LENGTH} characters (see .env.example)`,
      );
    }
    this.jwtSecret = secret;

    this.accessTokenTtlSeconds = positiveSeconds(config, 'JWT_ACCESS_TTL_SECONDS', DEFAULT_ACCESS_TTL_SECONDS);

    this.employeePolicy = {
      inactivityMs:
        positiveSeconds(config, 'SESSION_EMPLOYEE_INACTIVITY_SECONDS', DEFAULT_EMPLOYEE_INACTIVITY_SECONDS) * 1000,
      absoluteMs:
        positiveSeconds(config, 'SESSION_EMPLOYEE_ABSOLUTE_SECONDS', DEFAULT_EMPLOYEE_ABSOLUTE_SECONDS) * 1000,
    };

    this.customerPolicy = {
      inactivityMs:
        positiveSeconds(config, 'SESSION_CUSTOMER_INACTIVITY_SECONDS', DEFAULT_CUSTOMER_INACTIVITY_SECONDS) * 1000,
      absoluteMs:
        positiveSeconds(config, 'SESSION_CUSTOMER_ABSOLUTE_SECONDS', DEFAULT_CUSTOMER_ABSOLUTE_SECONDS) * 1000,
    };
  }

  // Cajero y Administrador comparten plazos; el Cliente tiene los suyos
  forRole(role: AuthRole): SessionPolicy {
    return role === 'CUSTOMER' ? this.customerPolicy : this.employeePolicy;
  }
}
