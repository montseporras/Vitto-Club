/*
  Warnings:

  - You are about to drop the column `code` on the `consumptions` table. All the data in the column will be lost.
  - You are about to drop the column `points_expiration_months` on the `consumptions` table. All the data in the column will be lost.
  - You are about to drop the column `registered_by_id` on the `consumptions` table. All the data in the column will be lost.
  - You are about to drop the column `total_points` on the `consumptions` table. All the data in the column will be lost.
  - You are about to drop the column `void_reason` on the `consumptions` table. All the data in the column will be lost.
  - You are about to drop the column `voided_by_id` on the `consumptions` table. All the data in the column will be lost.
  - You are about to drop the column `gold_min_points` on the `loyalty_points_configuration` table. All the data in the column will be lost.
  - You are about to drop the column `silver_min_points` on the `loyalty_points_configuration` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `points_lots` table. All the data in the column will be lost.
  - You are about to drop the `points_adjustments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumption_id]` on the table `points_lots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `registered_by_account_id` to the `consumptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registered_by_name` to the `consumptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `performed_by_name` to the `points_movements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('EMPLOYEE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditModule" AS ENUM ('EMPLOYEES', 'CUSTOMERS', 'CONSUMPTIONS', 'POINTS', 'REDEMPTIONS', 'REWARDS', 'MISSIONS', 'CONFIGURATION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_DEACTIVATED', 'USER_ACCOUNT_CREATED', 'USER_ACCOUNT_UPDATED', 'USER_ACCOUNT_DEACTIVATED', 'USER_ACCOUNT_REACTIVATED', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DEACTIVATED', 'CONSUMPTION_REGISTERED', 'CONSUMPTION_VOIDED', 'POINTS_ADJUSTED', 'POINTS_EXPIRED', 'REDEMPTION_CONFIRMED', 'REDEMPTION_USED', 'REDEMPTION_REJECTED', 'REDEMPTION_EXPIRED', 'REWARD_CREATED', 'REWARD_UPDATED', 'REWARD_ACTIVATED', 'REWARD_DEACTIVATED', 'REWARD_DELETED', 'REWARD_DISABLED', 'REWARD_ENABLED', 'MISSION_CREATED', 'MISSION_UPDATED', 'MISSION_DELETED', 'MISSION_COMPLETED', 'MISSION_REWARD_CLAIMED', 'MISSIONS_EXPIRED', 'POINTS_EQUIVALENCE_UPDATED', 'POINTS_VALIDITY_UPDATED', 'FIRST_PURCHASE_BONUS_UPDATED', 'LEVELS_UPDATED', 'LOGO_AND_MESSAGES_UPDATED', 'PROMOTIONS_UPDATED');

-- DropForeignKey
ALTER TABLE "consumptions" DROP CONSTRAINT "consumptions_registered_by_id_fkey";

-- DropForeignKey
ALTER TABLE "consumptions" DROP CONSTRAINT "consumptions_voided_by_id_fkey";

-- DropForeignKey
ALTER TABLE "points_adjustments" DROP CONSTRAINT "points_adjustments_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "points_adjustments" DROP CONSTRAINT "points_adjustments_employee_id_fkey";

-- DropIndex
DROP INDEX "accounts_email_key";

-- DropIndex
DROP INDEX "consumptions_code_key";

-- DropIndex
DROP INDEX "consumptions_registered_by_id_created_at_idx";

-- DropIndex
DROP INDEX "consumptions_status_created_at_idx";

-- DropIndex
DROP INDEX "employees_email_key";

-- DropIndex
DROP INDEX "points_lots_consumption_id_idx";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "consumptions" DROP COLUMN "code",
DROP COLUMN "points_expiration_months",
DROP COLUMN "registered_by_id",
DROP COLUMN "total_points",
DROP COLUMN "void_reason",
DROP COLUMN "voided_by_id",
ADD COLUMN     "registered_by_account_id" INTEGER NOT NULL,
ADD COLUMN     "registered_by_name" VARCHAR(161) NOT NULL,
ADD COLUMN     "voided_by_account_id" INTEGER,
ADD COLUMN     "voided_by_name" VARCHAR(161),
ADD COLUMN     "voided_reason" VARCHAR(500);

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "loyalty_points_configuration" DROP COLUMN "gold_min_points",
DROP COLUMN "silver_min_points";

-- AlterTable
ALTER TABLE "loyalty_program_configurations" ALTER COLUMN "gold_min_points" SET DEFAULT 800,
ALTER COLUMN "silver_min_points" SET DEFAULT 300;

-- AlterTable
ALTER TABLE "points_lots" DROP COLUMN "created_at",
ADD COLUMN     "accredited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expired_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "points_movements" ADD COLUMN     "performed_by_account_id" INTEGER,
ADD COLUMN     "performed_by_name" VARCHAR(200) NOT NULL;

-- DropTable
DROP TABLE "points_adjustments";

-- DropEnum
DROP TYPE "AdjustmentDirection";

-- DropEnum
DROP TYPE "Level";

-- CreateTable
CREATE TABLE "customer_points" (
    "customer_id" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "debt" INTEGER NOT NULL DEFAULT 0,
    "lifetime_points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_points_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_account_id" INTEGER,
    "performed_by" VARCHAR(200) NOT NULL,
    "module" "AuditModule",
    "action_code" "AuditAction",
    "description" VARCHAR(300),
    "affected_customer_id" INTEGER,
    "affected_customer_name" VARCHAR(161),
    "document_type" "DocumentType",
    "document_number" VARCHAR(20),
    "operation_code" VARCHAR(20),
    "details" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_points_lifetime_points_idx" ON "customer_points"("lifetime_points");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_module_created_at_idx" ON "audit_logs"("module", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_account_id_created_at_idx" ON "audit_logs"("actor_type", "actor_account_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_document_type_document_number_created_at_idx" ON "audit_logs"("document_type", "document_number", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_operation_code_idx" ON "audit_logs"("operation_code");

-- CreateIndex
CREATE INDEX "accounts_email_idx" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_active_email_key" ON "accounts"("email") WHERE ("is_active" = true);

-- CreateIndex
CREATE INDEX "consumptions_created_at_idx" ON "consumptions"("created_at");

-- CreateIndex
CREATE INDEX "consumptions_registered_by_account_id_created_at_idx" ON "consumptions"("registered_by_account_id", "created_at");

-- CreateIndex
CREATE INDEX "consumptions_status_idx" ON "consumptions"("status");

-- CreateIndex
CREATE INDEX "employees_email_idx" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_active_email_key" ON "employees"("email") WHERE ("is_active" = true);

-- CreateIndex
CREATE UNIQUE INDEX "points_lots_consumption_id_key" ON "points_lots"("consumption_id");

-- CreateIndex
CREATE INDEX "points_lots_status_expires_at_idx" ON "points_lots"("status", "expires_at");

-- CreateIndex
CREATE INDEX "points_movements_created_at_idx" ON "points_movements"("created_at");

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_configuration_version_fkey" FOREIGN KEY ("configuration_version") REFERENCES "loyalty_program_configurations"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_registered_by_account_id_fkey" FOREIGN KEY ("registered_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumptions" ADD CONSTRAINT "consumptions_voided_by_account_id_fkey" FOREIGN KEY ("voided_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_points" ADD CONSTRAINT "customer_points_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_performed_by_account_id_fkey" FOREIGN KEY ("performed_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
