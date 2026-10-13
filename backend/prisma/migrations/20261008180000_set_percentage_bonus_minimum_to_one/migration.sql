DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "first_purchase_bonus_configuration"
        WHERE "bonus_type" = 'PERCENTAGE' AND "bonus_value" < 1
    ) THEN
        RAISE EXCEPTION
            'Cannot require a 1%% minimum: review percentage values below 1 in first_purchase_bonus_configuration before migrating';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "loyalty_program_configurations"
        WHERE "bonus_type" = 'PERCENTAGE' AND "bonus_value" < 1
    ) THEN
        RAISE EXCEPTION
            'Cannot require a 1%% minimum: review percentage snapshots below 1 in loyalty_program_configurations before migrating';
    END IF;
END $$;

ALTER TABLE "first_purchase_bonus_configuration"
DROP CONSTRAINT "first_purchase_bonus_configuration_type_range_check";

ALTER TABLE "first_purchase_bonus_configuration"
ADD CONSTRAINT "first_purchase_bonus_configuration_type_range_check" CHECK (
    ("bonus_type" = 'PERCENTAGE' AND "bonus_value" >= 1 AND "bonus_value" <= 100)
    OR
    ("bonus_type" = 'FIXED_AMOUNT' AND "bonus_value" >= 1 AND "bonus_value" <= 10000 AND "bonus_value" = TRUNC("bonus_value"))
);

ALTER TABLE "loyalty_program_configurations"
DROP CONSTRAINT "loyalty_program_configurations_bonus_pair_check";

ALTER TABLE "loyalty_program_configurations"
ADD CONSTRAINT "loyalty_program_configurations_bonus_pair_check" CHECK (
    ("bonus_type" IS NULL AND "bonus_value" IS NULL)
    OR
    ("bonus_type" IS NOT NULL AND "bonus_value" IS NOT NULL AND (
      ("bonus_type" = 'PERCENTAGE' AND "bonus_value" >= 1 AND "bonus_value" <= 100)
      OR
      ("bonus_type" = 'FIXED_AMOUNT' AND "bonus_value" >= 1 AND "bonus_value" <= 10000 AND "bonus_value" = TRUNC("bonus_value"))
    ))
);
