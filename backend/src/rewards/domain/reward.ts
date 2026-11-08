import { DomainError } from './errors/domain.error.js';

// BASE-4: tipo Reward (contrato S4 §3.1 y §3.15). Las reglas de cada operación (crear, editar,
// activar, desactivar, eliminar) las agrega la historia que la necesita (US-34 a US-38).

// §2.1. DISABLED lo pone solo el Sistema; DELETED ("Dada de baja") es final
export const REWARD_STATUSES = ['ACTIVE', 'DISABLED', 'INACTIVE', 'DELETED'] as const;
export type RewardStatus = (typeof REWARD_STATUSES)[number];

// §2.2. Solo con status = DISABLED
export const REWARD_DISABLED_REASONS = ['OUT_OF_STOCK', 'EXPIRED'] as const;
export type RewardDisabledReason = (typeof REWARD_DISABLED_REASONS)[number];

export type RewardProps = {
  id: number;
  name: string;
  description: string | null;
  points: number;
  // null = sin límite
  stock: number | null;
  // Último día en que se puede canjear, YYYY-MM-DD en hora de Argentina. null = no vence
  expiresAt: string | null;
  status: RewardStatus;
  disabledReason: RewardDisabledReason | null;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class Reward {
  private constructor(private readonly props: RewardProps) {}

  // Rearma una recompensa ya guardada. Las reglas de la §3.15 las garantiza la base (CHECK).
  static reconstruct(props: RewardProps): Reward {
    return new Reward({ ...props });
  }

  getId(): number {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getDescription(): string | null {
    return this.props.description;
  }

  getPoints(): number {
    return this.props.points;
  }

  getStock(): number | null {
    return this.props.stock;
  }

  getExpiresAt(): string | null {
    return this.props.expiresAt;
  }

  getStatus(): RewardStatus {
    return this.props.status;
  }

  getDisabledReason(): RewardDisabledReason | null {
    return this.props.disabledReason;
  }

  getUsedCount(): number {
    return this.props.usedCount;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.props.deletedAt;
  }

  // US-37 (§3.4, §2.1): solo el Sistema la deshabilita, desde ACTIVE (sin stock o vencida). Una
  // DISABLED puede cambiar de motivo: el motivo es la primera condición que falla (vencida primero,
  // después sin stock; decisión de Melisa).
  disable(reason: RewardDisabledReason): void {
    if (this.props.status !== 'ACTIVE' && this.props.status !== 'DISABLED') {
      throw new DomainError('Only an ACTIVE or DISABLED reward can be disabled', 'status');
    }
    this.props.status = 'DISABLED';
    this.props.disabledReason = reason;
  }

  // US-37 (§3.4): el Sistema la habilita cuando vuelve a estar disponible (repuso stock o fecha)
  enable(): void {
    if (this.props.status !== 'DISABLED') {
      throw new DomainError('Only a DISABLED reward can be enabled', 'status');
    }
    this.props.status = 'ACTIVE';
    this.props.disabledReason = null;
  }
}
