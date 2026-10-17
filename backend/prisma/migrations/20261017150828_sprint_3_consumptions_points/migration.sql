-- CreateEnum
CREATE TYPE "ConsumptionStatus" AS ENUM ('REGISTERED', 'VOIDED');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "PointsMovementType" AS ENUM ('PURCHASE_CREDIT', 'VOID_REVERSAL', 'MANUAL_ADJUSTMENT', 'EXPIRATION', 'REDEMPTION');

-- CreateEnum
CREATE TYPE "PointsLotStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AdjustmentDirection" AS ENUM ('ADD', 'SUBTRACT');

-- AlterTable
ALTER TABLE "loyalty_points_configuration" ADD COLUMN     "gold_min_points" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "silver_min_points" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "loyalty_program_configurations" ADD COLUMN     "gold_min_points" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "silver_min_points" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "consumptions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "registered_by_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "points" INTEGER NOT NULL,
    "bonus_points" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL,
    "notes" VARCHAR(255),
    "base_amount" DECIMAL(12,2) NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "configuration_version" INTEGER NOT NULL,
    "points_expiration_months" INTEGER NOT NULL,
    "status" "ConsumptionStatus" NOT NULL DEFAULT 'REGISTERED',
    "voided_at" TIMESTAMP(3),
    "voided_by_id" INTEGER,
    "void_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_lots" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "consumption_id" INTEGER,
    "initial_points" INTEGER NOT NULL,
    "remaining_points" INTEGER NOT NULL,
    "status" "PointsLotStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_movements" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "lot_id" INTEGER,
    "consumption_id" INTEGER,
    "type" "PointsMovementType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_adjustments" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "direction" "AdjustmentDirection" NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "movement_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consumptions_code_key" ON "consumptions"("code");

-- CreateIndex
CREATE INDEX "consumptions_customer_id_created_at_idx" ON "consumptions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "consumptions_status_created_at_idx" ON "consumptions"("status", "created_at");

-- CreateIndex
CREATE INDEX "consumptions_registered_by_id_created_at_idx" ON "consumptions"("registered_by_id", "created_at");

-- CreateIndex
CREATE INDEX "points_lots_customer_id_status_expires_at_idx" ON "points_lots"("customer_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "points_lots_consumption_id_idx" ON "points_lots"("consumption_id");

-- CreateIndex
CREATE INDEX "points_movements_customer_id_created_at_idx" ON "points_movements"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "points_movements_type_created_at_idx" ON "points_movements"("type", "created_at");

-- CreateIndex
CREATE INDEX "points_movements_consumption_id_idx" ON "points_movements"("consumption_id");

-- CreateIndex
CREATE INDEX "points_movements_lot_id_idx" ON "points_movements"("lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "points_adjustments_movement_id_key" ON "points_adjustments"("movement_id");

-- CreateIndex
CREATE INDEX "points_adjustments_customer_id_created_at_idx" ON "points_adjustments"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "points_adjustments_employee_id_created_at_idx" ON "points_adjustments"("employee_id", "created_at");

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_lots" ADD CONSTRAINT "points_lots_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_lots" ADD CONSTRAINT "points_lots_consumption_id_fkey" FOREIGN KEY ("consumption_id") REFERENCES "consumptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "points_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_consumption_id_fkey" FOREIGN KEY ("consumption_id") REFERENCES "consumptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_adjustments" ADD CONSTRAINT "points_adjustments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_adjustments" ADD CONSTRAINT "points_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
