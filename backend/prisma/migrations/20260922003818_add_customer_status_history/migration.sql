-- CreateEnum
CREATE TYPE "CustomerStatusAction" AS ENUM ('DEACTIVATED', 'ACTIVATED');

-- CreateTable
CREATE TABLE "customer_status_changes" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "action" "CustomerStatusAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_status_changes_customer_id_created_at_idx" ON "customer_status_changes"("customer_id", "created_at");

-- AddForeignKey
ALTER TABLE "customer_status_changes" ADD CONSTRAINT "customer_status_changes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
