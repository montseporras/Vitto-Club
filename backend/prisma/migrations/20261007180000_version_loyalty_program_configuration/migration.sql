CREATE TABLE "loyalty_program_configurations" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL,
    "base_amount" DECIMAL(12,2),
    "points_awarded" INTEGER,
    "points_expiration_months" INTEGER NOT NULL DEFAULT 12,
    "bonus_type" "FirstPurchaseBonusType",
    "bonus_value" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_program_configurations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_program_configurations_version_key" UNIQUE ("version"),
    CONSTRAINT "loyalty_program_configurations_base_pair_check" CHECK (
      ("base_amount" IS NULL AND "points_awarded" IS NULL)
      OR
      ("base_amount" > 0 AND "points_awarded" > 0)
    ),
    CONSTRAINT "loyalty_program_configurations_validity_check" CHECK ("points_expiration_months" > 0),
    CONSTRAINT "loyalty_program_configurations_bonus_pair_check" CHECK (
      ("bonus_type" IS NULL AND "bonus_value" IS NULL)
      OR
      ("bonus_type" IS NOT NULL AND "bonus_value" IS NOT NULL AND (
        ("bonus_type" = 'PERCENTAGE' AND "bonus_value" >= 0.1 AND "bonus_value" <= 100)
        OR
        ("bonus_type" = 'FIXED_AMOUNT' AND "bonus_value" >= 1 AND "bonus_value" <= 10000 AND "bonus_value" = TRUNC("bonus_value"))
      ))
    ),
    CONSTRAINT "loyalty_program_configurations_validity_dates_check" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE UNIQUE INDEX "loyalty_program_configurations_one_active_key"
ON "loyalty_program_configurations" ("is_active")
WHERE "is_active" = true;

-- Preserve the latest singleton values as version 1; do not update or delete legacy rows.
INSERT INTO "loyalty_program_configurations" (
    "version",
    "base_amount",
    "points_awarded",
    "points_expiration_months",
    "bonus_type",
    "bonus_value",
    "is_active",
    "valid_from",
    "created_at"
)
SELECT
    1,
    equivalence."base_amount",
    equivalence."points_awarded",
    COALESCE(validity."points_expiration_months", 12),
    bonus."bonus_type",
    bonus."bonus_value",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT 1 AS singleton) AS seed
LEFT JOIN "loyalty_points_configuration" AS equivalence ON equivalence."id" = 1
LEFT JOIN "loyalty_points_validity_configuration" AS validity ON validity."id" = 1
LEFT JOIN "first_purchase_bonus_configuration" AS bonus ON bonus."id" = 1;
