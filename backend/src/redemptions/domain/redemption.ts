// BASE-4: tipo Redemption (contrato S4 §3.6.2 y §3.15). Las transiciones (usar, rechazar,
// cancelar, vencer) las agrega la historia que las necesita (US-40 a US-45).

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
}
