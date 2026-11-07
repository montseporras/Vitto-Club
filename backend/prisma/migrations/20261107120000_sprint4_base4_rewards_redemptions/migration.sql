-- BASE-4 (Sprint 4): modelo de recompensas y canjes (contrato S4 §3.15, CA-B4.1 y CA-B4.2).
-- Crea rewards, redemptions, los enums RewardStatus, RewardDisabledReason, RedemptionStatus y
-- RedemptionOrigin, y la columna points_movements.redemption_id. Los CHECK y el índice único
-- parcial del nombre están escritos a mano al final (Prisma no los modela); el test
-- test/base4-schema.e2e-spec.ts verifica que existan.

-- §3.15: antes de agregar el CHECK de redemption_id no puede haber movimientos REDEMPTION
-- viejos (de seeds). Si los hay, la migración corta con un mensaje claro: borrarlos en
-- desarrollo y volver a correrla.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "points_movements" WHERE "type" = 'REDEMPTION') THEN
    RAISE EXCEPTION 'points_movements tiene filas REDEMPTION sin canje. Borrarlas en desarrollo antes de migrar (contrato S4 §3.15).';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('ACTIVE', 'DISABLED', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "RewardDisabledReason" AS ENUM ('OUT_OF_STOCK', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('CONFIRMED', 'USED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RedemptionOrigin" AS ENUM ('APP', 'COUNTER');

-- AlterTable
ALTER TABLE "points_movements" ADD COLUMN     "redemption_id" INTEGER;

-- CreateTable
CREATE TABLE "rewards" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "points" INTEGER NOT NULL,
    "stock" INTEGER,
    "expires_at" DATE,
    "status" "RewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "disabled_reason" "RewardDisabledReason",
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" SERIAL NOT NULL,
    "code" CHAR(6) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "reward_id" INTEGER NOT NULL,
    "reward_name" VARCHAR(80) NOT NULL,
    "points" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "origin" "RedemptionOrigin" NOT NULL,
    "confirmed_by_account_id" INTEGER,
    "confirmed_by_name" VARCHAR(161),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_account_id" INTEGER,
    "resolved_by_name" VARCHAR(200),
    "rejection_reason" VARCHAR(500),
    "balance_before" INTEGER,
    "balance_after" INTEGER,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rewards_status_expires_at_idx" ON "rewards"("status", "expires_at");

-- CreateIndex
CREATE INDEX "rewards_updated_at_idx" ON "rewards"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_code_key" ON "redemptions"("code");

-- CreateIndex
CREATE INDEX "redemptions_customer_id_created_at_idx" ON "redemptions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "redemptions_status_expires_at_idx" ON "redemptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "redemptions_reward_id_status_idx" ON "redemptions"("reward_id", "status");

-- CreateIndex
CREATE INDEX "redemptions_created_at_idx" ON "redemptions"("created_at");

-- AddForeignKey
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "redemptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_confirmed_by_account_id_fkey" FOREIGN KEY ("confirmed_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_resolved_by_account_id_fkey" FOREIGN KEY ("resolved_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Escrito a mano (Prisma no modela CHECK ni índices sobre expresiones)
-- =====================================================================

-- rewards (§3.15)
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_points_range_check"
  CHECK ("points" BETWEEN 1 AND 1000000);
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_stock_range_check"
  CHECK ("stock" IS NULL OR "stock" BETWEEN 0 AND 100000);
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_used_count_check"
  CHECK ("used_count" >= 0);
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_disabled_reason_check"
  CHECK (("status" = 'DISABLED') = ("disabled_reason" IS NOT NULL));
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_deleted_at_check"
  CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL));

-- Nombre único sin distinguir mayúsculas ni espacios de los bordes, solo entre las recompensas
-- no dadas de baja: una DELETED libera el nombre (CA-B4.3).
CREATE UNIQUE INDEX "rewards_active_name_key" ON "rewards" (lower(trim("name")))
  WHERE "status" <> 'DELETED';

-- redemptions (§3.15)
-- Alfabeto de §3.6.1: sin 0, O, 1 ni I. CHAR(6) rellena con espacios, que no cumplen el patrón.
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_code_format_check"
  CHECK ("code" ~ '^[A-HJ-NP-Z2-9]{6}$');
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_points_check"
  CHECK ("points" > 0);
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_confirmed_by_check"
  CHECK (("origin" = 'COUNTER') = ("confirmed_by_account_id" IS NOT NULL));
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_expires_at_check"
  CHECK ("expires_at" = "created_at" + interval '15 minutes');
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_resolved_at_check"
  CHECK (("status" = 'CONFIRMED') = ("resolved_at" IS NULL));
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_rejection_reason_check"
  CHECK (("status" = 'REJECTED') = ("rejection_reason" IS NOT NULL));
-- Saldo antes y después: con valor solo en USED, y obligatorios ahí
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_balance_before_check"
  CHECK (("status" = 'USED') = ("balance_before" IS NOT NULL));
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_balance_after_check"
  CHECK (("status" = 'USED') = ("balance_after" IS NOT NULL));

-- points_movements (§3.15): REDEMPTION siempre con su canje, y solo REDEMPTION lo tiene
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_redemption_check"
  CHECK (("type" = 'REDEMPTION') = ("redemption_id" IS NOT NULL));
