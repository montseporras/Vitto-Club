CREATE TABLE "loyalty_points_configuration" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "base_amount" DECIMAL(12, 2) NOT NULL,
    "points_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_points_configuration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_points_configuration_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "loyalty_points_configuration_base_amount_positive_check" CHECK ("base_amount" > 0),
    CONSTRAINT "loyalty_points_configuration_points_awarded_positive_check" CHECK ("points_awarded" > 0)
);
