-- BASE-5 (Sprint 5): modelo de misiones, notificaciones, envíos de promociones, imágenes y beneficios
-- (contrato S5 §3.15 y §2, CA-B5.1 a CA-B5.4). Una sola migración, como BASE-4.
-- Crea missions, customer_missions, notification_templates, notification_settings, notifications y
-- promotion_sends; los enums nuevos (y los valores nuevos de PointsMovementType y AuditAction); las
-- columnas de fotos en customers y rewards, los beneficios y el mínimo de cliente frecuente en
-- loyalty_program_configurations y points_movements.customer_mission_id.
-- La primera parte la genera Prisma. Los CHECK, el índice único parcial del nombre de la misión, el
-- trigger de solo inserción de notifications y los valores por defecto están escritos a mano al
-- final (Prisma no los modela); el test test/base5-schema.e2e-spec.ts verifica que existan.
-- La migración solo agrega: no modifica ni borra nada de lo que ya existe.

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "MissionObjectiveType" AS ENUM ('CONSUMPTION_COUNT', 'CONSUMPTION_AMOUNT');

-- CreateEnum
CREATE TYPE "CustomerMissionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CLAIMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POINTS_EXPIRING', 'BIRTHDAY', 'PROMOTION', 'MISSION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PromotionSendStatus" AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PointsMovementType" ADD VALUE 'MISSION_REWARD';
ALTER TYPE "PointsMovementType" ADD VALUE 'BIRTHDAY_BONUS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'FREQUENT_CUSTOMERS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'BIRTHDAY_BONUS_GRANTED';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "photo_public_id" VARCHAR(255),
ADD COLUMN     "photo_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "loyalty_program_configurations" ADD COLUMN     "bronze_benefit" VARCHAR(255),
ADD COLUMN     "frequent_min_consumptions" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "gold_benefit" VARCHAR(255),
ADD COLUMN     "silver_benefit" VARCHAR(255);

-- AlterTable
ALTER TABLE "points_movements" ADD COLUMN     "customer_mission_id" INTEGER;

-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "photo_public_id" VARCHAR(255),
ADD COLUMN     "photo_url" VARCHAR(500);

-- CreateTable
CREATE TABLE "missions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "objective_type" "MissionObjectiveType" NOT NULL,
    "target" DECIMAL(12,2) NOT NULL,
    "days_of_week" SMALLINT[],
    "time_from" TIME,
    "time_to" TIME,
    "reward_points" INTEGER,
    "start_month" DATE NOT NULL,
    "end_month" DATE,
    "pending_changes" JSONB,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_missions" (
    "id" SERIAL NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "period" DATE NOT NULL,
    "objective_type" "MissionObjectiveType" NOT NULL,
    "target" DECIMAL(12,2) NOT NULL,
    "days_of_week" SMALLINT[],
    "time_from" TIME,
    "time_to" TIME,
    "reward_points" INTEGER,
    "progress" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "CustomerMissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completed_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "claimed_by" VARCHAR(10),
    "expiration_reason" VARCHAR(100),

    CONSTRAINT "customer_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "type" "NotificationType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subject" VARCHAR(120) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "birthday_bonus_points" INTEGER NOT NULL DEFAULT 100,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" VARCHAR(150) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" VARCHAR(500),
    "dedupe_key" VARCHAR(100) NOT NULL,
    "promotion_send_id" INTEGER,
    "resent_from_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_sends" (
    "id" SERIAL NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "level" VARCHAR(10),
    "scheduled_at" TIMESTAMP(3),
    "status" "PromotionSendStatus" NOT NULL,
    "sent_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "recipients" INTEGER,
    "created_by_employee_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_missions_status_period_idx" ON "customer_missions"("status", "period");

-- CreateIndex
CREATE INDEX "customer_missions_customer_id_period_idx" ON "customer_missions"("customer_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "customer_missions_mission_id_customer_id_period_key" ON "customer_missions"("mission_id", "customer_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_resent_from_id_key" ON "notifications"("resent_from_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_type_customer_id_dedupe_key_key" ON "notifications"("type", "customer_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "promotion_sends_status_scheduled_at_idx" ON "promotion_sends"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "points_movements_customer_mission_id_key" ON "points_movements"("customer_mission_id");

-- AddForeignKey
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_customer_mission_id_fkey" FOREIGN KEY ("customer_mission_id") REFERENCES "customer_missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_promotion_send_id_fkey" FOREIGN KEY ("promotion_send_id") REFERENCES "promotion_sends"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resent_from_id_fkey" FOREIGN KEY ("resent_from_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_sends" ADD CONSTRAINT "promotion_sends_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Escrito a mano (Prisma no modela CHECK, índices sobre expresiones ni triggers)
-- =====================================================================

-- missions (§3.15)
ALTER TABLE "missions" ADD CONSTRAINT "missions_target_check"
  CHECK ("target" > 0);
-- target entero cuando mide cantidad de consumos
ALTER TABLE "missions" ADD CONSTRAINT "missions_target_whole_count_check"
  CHECK ("objective_type" <> 'CONSUMPTION_COUNT' OR "target" = trunc("target"));
-- días de la semana: solo valores 1 a 7 (null o vacío = todos los días)
ALTER TABLE "missions" ADD CONSTRAINT "missions_days_of_week_check"
  CHECK ("days_of_week" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]);
-- franja horaria: las dos horas o ninguna, y desde < hasta
ALTER TABLE "missions" ADD CONSTRAINT "missions_time_range_check"
  CHECK (("time_from" IS NULL) = ("time_to" IS NULL) AND ("time_from" IS NULL OR "time_from" < "time_to"));
ALTER TABLE "missions" ADD CONSTRAINT "missions_reward_points_check"
  CHECK ("reward_points" IS NULL OR "reward_points" BETWEEN 1 AND 100000);
ALTER TABLE "missions" ADD CONSTRAINT "missions_end_month_check"
  CHECK ("end_month" IS NULL OR "end_month" >= "start_month");
ALTER TABLE "missions" ADD CONSTRAINT "missions_deleted_at_check"
  CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL));
-- dos misiones no dadas de baja no pueden llamarse igual (sin importar mayúsculas ni espacios de los extremos)
CREATE UNIQUE INDEX "missions_active_name_key" ON "missions" (lower(trim("name")))
  WHERE "status" <> 'DELETED';

-- customer_missions (§3.15)
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_progress_check"
  CHECK ("progress" >= 0 AND "progress" <= "target");
-- las fechas, claimed_by y expiration_reason coinciden con el estado
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_completed_at_check"
  CHECK (("status" IN ('COMPLETED', 'CLAIMED')) = ("completed_at" IS NOT NULL));
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_claimed_at_check"
  CHECK (("status" = 'CLAIMED') = ("claimed_at" IS NOT NULL));
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_claimed_by_check"
  CHECK (("status" = 'CLAIMED') = ("claimed_by" IS NOT NULL) AND ("claimed_by" IS NULL OR "claimed_by" IN ('CUSTOMER', 'SYSTEM')));
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_expired_at_check"
  CHECK (("status" = 'EXPIRED') = ("expired_at" IS NOT NULL));
ALTER TABLE "customer_missions" ADD CONSTRAINT "customer_missions_expiration_reason_check"
  CHECK (("status" = 'EXPIRED') = ("expiration_reason" IS NOT NULL));

-- points_movements (§3.15): MISSION_REWARD siempre con su asignación, y solo MISSION_REWARD la tiene
ALTER TABLE "points_movements" ADD CONSTRAINT "points_movements_mission_check"
  CHECK (("type" = 'MISSION_REWARD') = ("customer_mission_id" IS NOT NULL));

-- loyalty_program_configurations (§3.15): mínimo de consumos de un cliente frecuente
ALTER TABLE "loyalty_program_configurations" ADD CONSTRAINT "loyalty_program_configurations_frequent_min_check"
  CHECK ("frequent_min_consumptions" BETWEEN 1 AND 100);

-- notification_templates: una fila por tipo automático; PROMOTION no tiene plantilla (S5-37)
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_type_check"
  CHECK ("type" <> 'PROMOTION');

-- notification_settings: fila única, y los puntos de cumpleaños de 0 a 10.000 (0 = no regala)
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_singleton_check"
  CHECK ("id" = 1);
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_birthday_bonus_points_check"
  CHECK ("birthday_bonus_points" BETWEEN 0 AND 10000);

-- notifications: el error existe si y solo si falló, y una PROMOTION siempre pertenece a un envío
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_error_check"
  CHECK (("status" = 'FAILED') = ("error" IS NOT NULL));
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_promotion_send_check"
  CHECK (("type" = 'PROMOTION') = ("promotion_send_id" IS NOT NULL));

-- promotion_sends: nivel válido (null = todos los clientes activos) y estado coherente con las fechas
ALTER TABLE "promotion_sends" ADD CONSTRAINT "promotion_sends_level_check"
  CHECK ("level" IS NULL OR "level" IN ('BRONZE', 'SILVER', 'GOLD'));
ALTER TABLE "promotion_sends" ADD CONSTRAINT "promotion_sends_scheduled_check"
  CHECK ("status" <> 'SCHEDULED' OR ("scheduled_at" IS NOT NULL AND "sent_at" IS NULL));
ALTER TABLE "promotion_sends" ADD CONSTRAINT "promotion_sends_sent_check"
  CHECK ("status" <> 'SENT' OR "sent_at" IS NOT NULL);
ALTER TABLE "promotion_sends" ADD CONSTRAINT "promotion_sends_cancelled_check"
  CHECK (("status" = 'CANCELLED') = ("cancelled_at" IS NOT NULL));

-- notifications es solo inserción, igual que audit_logs y points_movements: UPDATE, DELETE y TRUNCATE se rechazan
CREATE OR REPLACE FUNCTION reject_notification_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'notifications is append-only'
    USING ERRCODE = '55000';
END
$$;

DROP TRIGGER IF EXISTS notifications_immutable ON "notifications";
CREATE TRIGGER notifications_immutable
  BEFORE UPDATE OR DELETE ON "notifications"
  FOR EACH ROW EXECUTE FUNCTION reject_notification_mutation();

DROP TRIGGER IF EXISTS notifications_no_truncate ON "notifications";
CREATE TRIGGER notifications_no_truncate
  BEFORE TRUNCATE ON "notifications"
  FOR EACH STATEMENT EXECUTE FUNCTION reject_notification_mutation();

-- =====================================================================
-- Valores por defecto (CA-B5.4): los textos de contrato S5 §3.6.1. Una fila por tipo AUTOMÁTICO
-- (no PROMOTION), la fila única de configuración con 100 puntos de cumpleaños. La configuración del
-- programa ya existente toma frequent_min_consumptions = 3 por el DEFAULT de la columna.
-- =====================================================================
INSERT INTO "notification_templates" ("type", "active", "subject", "body", "updated_at") VALUES
  ('POINTS_EXPIRING', true, 'Tus puntos están por vencer',
   'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!', now()),
  ('BIRTHDAY', true, '¡Feliz cumpleaños!',
   '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros.', now()),
  ('MISSION', true, '¡Completaste una misión!',
   '¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa.', now());

INSERT INTO "notification_settings" ("id", "birthday_bonus_points", "updated_at") VALUES (1, 100, now());
