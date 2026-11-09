import { DomainError } from './errors/domain.error.js';

// BASE-4: tipo Redemption (contrato S4 §3.6.2 y §3.15). Las transiciones (usar, rechazar,
// cancelar, vencer) las agrega la historia que las necesita (US-40 a US-45).

// US-44 (§3.11, decisión S4-3): el canje dura 15 minutos desde que se confirma. Constante, no
// configurable. El CHECK redemptions_expires_at_check de la base garantiza expiresAt = createdAt + 15 min.
export const REDEMPTION_DURATION_MS = 15 * 60 * 1000;

// §3.10.4: nombre que se guarda en resolved_by_name cuando el canje lo resuelve el Sistema
export const SYSTEM_RESOLVER_NAME = 'Sistema';

// §2.3. Nace CONFIRMED; los otros cuatro son finales. No existe "Pendiente"
export const REDEMPTION_STATUSES = ['CONFIRMED', 'USED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

// §2.4
export const REDEMPTION_ORIGINS = ['APP', 'COUNTER'] as const;
export type RedemptionOrigin = (typeof REDEMPTION_ORIGINS)[number];

export type RedemptionProps = {
  id: number;
  code: string;
  customerId: number;
  rewardId: number;
  // Snapshot de la recompensa al confirmar
  rewardName: string;
  points: number;
  status: RedemptionStatus;
  origin: RedemptionOrigin;
  // Empleado que lo confirmó en la caja; null si origin = APP
  confirmedByAccountId: number | null;
  confirmedByName: string | null;
  createdAt: Date;
  expiresAt: Date;
  resolvedAt: Date | null;
  // null para el Sistema y para CANCELLED
  resolvedByAccountId: number | null;
  // Nombre del empleado o "Sistema"; null en CANCELLED
  resolvedByName: string | null;
  rejectionReason: string | null;
  // Solo en USED
  balanceBefore: number | null;
  balanceAfter: number | null;
};

export class Redemption {
  private constructor(private readonly props: RedemptionProps) {}

  // Rearma un canje ya guardado. Las reglas de la §3.15 las garantiza la base (CHECK).
  static reconstruct(props: RedemptionProps): Redemption {
    return new Redemption({ ...props });
  }

  // US-42 (§3.9.1 paso 9): pasa el canje a USED. Quien llama ya validó que está CONFIRMED,
  // que el cliente y la recompensa están bien, y que el saldo alcanza (pasos 3 a 6).
  use(input: {
    resolvedByAccountId: number;
    resolvedByName: string;
    balanceBefore: number;
    balanceAfter: number;
    now: Date;
  }): void {
    this.props.status = 'USED';
    this.props.resolvedAt = input.now;
    this.props.resolvedByAccountId = input.resolvedByAccountId;
    this.props.resolvedByName = input.resolvedByName;
    this.props.balanceBefore = input.balanceBefore;
    this.props.balanceAfter = input.balanceAfter;
  }

  getId(): number {
    return this.props.id;
  }

  getCode(): string {
    return this.props.code;
  }

  getCustomerId(): number {
    return this.props.customerId;
  }

  getRewardId(): number {
    return this.props.rewardId;
  }

  getRewardName(): string {
    return this.props.rewardName;
  }

  getPoints(): number {
    return this.props.points;
  }

  getStatus(): RedemptionStatus {
    return this.props.status;
  }

  getOrigin(): RedemptionOrigin {
    return this.props.origin;
  }

  getConfirmedByAccountId(): number | null {
    return this.props.confirmedByAccountId;
  }

  getConfirmedByName(): string | null {
    return this.props.confirmedByName;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getExpiresAt(): Date {
    return this.props.expiresAt;
  }

  getResolvedAt(): Date | null {
    return this.props.resolvedAt;
  }

  getResolvedByAccountId(): number | null {
    return this.props.resolvedByAccountId;
  }

  getResolvedByName(): string | null {
    return this.props.resolvedByName;
  }

  getRejectionReason(): string | null {
    return this.props.rejectionReason;
  }

  getBalanceBefore(): number | null {
    return this.props.balanceBefore;
  }

  getBalanceAfter(): number | null {
    return this.props.balanceAfter;
  }

  // US-44 (CA-44.6): un canje Confirmado vence cuando expiresAt <= ahora. Uno de hace 14:59 no
  // vence; uno de hace 15:00, sí. Los estados finales nunca "vencen" (CA-44.5).
  isExpired(now: Date): boolean {
    return this.props.status === 'CONFIRMED' && this.props.expiresAt.getTime() <= now.getTime();
  }

  // US-44 (CA-44.4, §3.11): CONFIRMED → EXPIRED, resuelto por el Sistema. resolvedAt es
  // expiresAt (cuándo venció de verdad), no la hora del barrido. No toca saldo ni stock: no hay
  // reintegro porque confirmar no descontó nada (decisión S4-1).
  expire(now: Date): void {
    if (this.props.status !== 'CONFIRMED') {
      throw new DomainError('Only a CONFIRMED redemption can expire', 'status');
    }
    if (!this.isExpired(now)) {
      throw new DomainError('The redemption has not expired yet', 'expiresAt');
    }
    this.props.status = 'EXPIRED';
    this.props.resolvedAt = this.props.expiresAt;
    this.props.resolvedByAccountId = null;
    this.props.resolvedByName = SYSTEM_RESOLVER_NAME;
  }

  // US-43 (§3.10.1 y §3.10.4): CONFIRMED → REJECTED, con motivo. Lo resuelve un empleado
  // (accountId y nombre) o el Sistema (accountId null, "Sistema"). No reintegra nada (S4-1).
  // El motivo llega ya recortado y validado (5 a 500) por el DTO, o es uno fijo del Sistema.
  reject(reason: string, resolver: RedemptionResolver, now: Date): void {
    this.assertResolvable(now);
    if (reason.trim().length === 0) {
      throw new DomainError('A rejection needs a reason', 'reason');
    }
    this.props.status = 'REJECTED';
    this.props.resolvedAt = now;
    this.props.resolvedByAccountId = resolver.accountId;
    this.props.resolvedByName = resolver.name;
    this.props.rejectionReason = reason;
  }

  // US-43 (§3.10.3): CONFIRMED → CANCELLED, por el Cliente. resolvedBy queda null: el cliente
  // nunca figura como actor. No reintegra nada (S4-1).
  cancel(now: Date): void {
    this.assertResolvable(now);
    this.props.status = 'CANCELLED';
    this.props.resolvedAt = now;
    this.props.resolvedByAccountId = null;
    this.props.resolvedByName = null;
  }

  // Solo un Confirmado vigente se rechaza o se cancela: uno vencido se vence primero (US-44)
  private assertResolvable(now: Date): void {
    if (this.props.status !== 'CONFIRMED') {
      throw new DomainError('Only a CONFIRMED redemption can be resolved', 'status');
    }
    if (this.isExpired(now)) {
      throw new DomainError('An expired redemption cannot be resolved', 'expiresAt');
    }
  }
}

// Quién resuelve un canje: un empleado o el Sistema (accountId null, nombre "Sistema")
export type RedemptionResolver = { accountId: number | null; name: string };

export const SYSTEM_RESOLVER: RedemptionResolver = { accountId: null, name: SYSTEM_RESOLVER_NAME };

// §2.3: texto de cada estado en la UI. Lo usa el mensaje 'El canje ya está en estado "{Estado}".'
export const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  CONFIRMED: 'Confirmado',
  USED: 'Utilizado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};
