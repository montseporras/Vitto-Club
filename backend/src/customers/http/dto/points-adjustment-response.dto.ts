import type { AjustarResult } from '../../../points/application/points.service.js';
import { describeMovement, toPerformedBy } from '../../../points/domain/points-movement.js';

type PerformedBy = { actorType: 'EMPLOYEE' | 'SYSTEM'; accountId: number | null; name: string };

// Respuesta 201 de POST /customers/:id/ajustes-de-puntos (§3.5.1). description y performedBy
// salen de las mismas funciones que los movimientos de US-26, así se ven igual en las dos.
export class PointsAdjustmentResponseDto {
  movement!: {
    id: number;
    createdAt: string;
    type: 'MANUAL_ADJUSTMENT';
    points: number;
    balanceAfter: number;
    description: string;
    reason: string;
    performedBy: PerformedBy;
  };
  balanceBefore!: number;
  balanceAfter!: number;

  static fromResult(result: AjustarResult): PointsAdjustmentResponseDto {
    const { movement } = result;
    return {
      movement: {
        id: movement.id,
        createdAt: movement.createdAt.toISOString(),
        type: 'MANUAL_ADJUSTMENT',
        points: movement.points,
        balanceAfter: movement.balanceAfter,
        description: describeMovement({
          id: movement.id,
          type: 'MANUAL_ADJUSTMENT',
          consumptionId: null,
          reason: movement.reason,
          lot: null,
        }),
        reason: movement.reason,
        performedBy: toPerformedBy({
          performedByAccountId: movement.performedBy.accountId,
          performedByName: movement.performedBy.name,
        }),
      },
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
    };
  }
}
