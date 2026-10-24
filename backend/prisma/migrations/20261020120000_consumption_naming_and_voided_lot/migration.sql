-- "Compra" pasa a "Consumo" en los nombres que ya estaban en la base (contrato §2).
ALTER TYPE "FirstPurchaseBonusType" RENAME TO "FirstConsumptionBonusType";
ALTER TYPE "PointsMovementType" RENAME VALUE 'PURCHASE_CREDIT' TO 'CONSUMPTION_CREDIT';
ALTER TYPE "AuditAction" RENAME VALUE 'FIRST_PURCHASE_BONUS_UPDATED' TO 'FIRST_CONSUMPTION_BONUS_UPDATED';

ALTER TABLE "first_purchase_bonus_configuration" RENAME TO "first_consumption_bonus_configuration";
ALTER TABLE "first_consumption_bonus_configuration" RENAME CONSTRAINT "first_purchase_bonus_configuration_pkey" TO "first_consumption_bonus_configuration_pkey";
ALTER TABLE "first_consumption_bonus_configuration" RENAME CONSTRAINT "first_purchase_bonus_configuration_singleton_check" TO "first_consumption_bonus_configuration_singleton_check";
ALTER TABLE "first_consumption_bonus_configuration" RENAME CONSTRAINT "first_purchase_bonus_configuration_value_positive_check" TO "first_consumption_bonus_configuration_value_positive_check";
ALTER TABLE "first_consumption_bonus_configuration" RENAME CONSTRAINT "first_purchase_bonus_configuration_type_range_check" TO "first_consumption_bonus_configuration_type_range_check";

-- Estado "Anulado" del lote (máquina de estados Movimiento de puntos): se anuló su consumo.
ALTER TYPE "PointsLotStatus" ADD VALUE 'VOIDED';
