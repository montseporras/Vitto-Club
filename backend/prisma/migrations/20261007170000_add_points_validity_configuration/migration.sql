CREATE TABLE "loyalty_points_validity_configuration" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "points_expiration_months" INTEGER NOT NULL DEFAULT 12,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_points_validity_configuration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_points_validity_configuration_singleton_check" CHECK ("id" = 1),
    CONSTRAINT "loyalty_points_validity_configuration_months_positive_check" CHECK ("points_expiration_months" > 0)
);
