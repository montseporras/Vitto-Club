CREATE TYPE "FirstPurchaseBonusType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

CREATE TABLE "first_purchase_bonus_configuration" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bonus_type" "FirstPurchaseBonusType" NOT NULL,
    "bonus_value" DECIMAL(12, 2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "first_purchase_bonus_configuration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "first_purchase_bonus_configuration_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "first_purchase_bonus_configuration_value_positive_check" CHECK ("bonus_value" > 0),
    CONSTRAINT "first_purchase_bonus_configuration_type_range_check" CHECK (
      ("bonus_type" = 'PERCENTAGE' AND "bonus_value" >= 0.1 AND "bonus_value" <= 100)
      OR
      ("bonus_type" = 'FIXED_AMOUNT' AND "bonus_value" >= 1 AND "bonus_value" <= 10000 AND "bonus_value" = TRUNC("bonus_value"))
    )
);
