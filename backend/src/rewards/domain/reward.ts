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

  // US-42 (CA-42.3, §3.9.1 paso 8): suma 1 a usedCount siempre. Si tiene límite de stock
  // (stock != null), lo descuenta; si llega a 0, pasa a DISABLED/OUT_OF_STOCK (lo pone el
  // Sistema). Devuelve si se deshabilitó, para que quien orquesta decida si audita
  // REWARD_DISABLED.
  registerUse(): { disabled: boolean } {
    this.props.usedCount += 1;
    if (this.props.stock === null) {
      return { disabled: false };
    }
    this.props.stock -= 1;
    if (this.props.stock <= 0) {
      this.props.status = 'DISABLED';
      this.props.disabledReason = 'OUT_OF_STOCK';
      return { disabled: true };
    }
    return { disabled: false };
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
}
