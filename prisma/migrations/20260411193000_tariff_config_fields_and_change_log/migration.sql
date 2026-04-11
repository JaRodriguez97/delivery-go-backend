-- AlterTable
ALTER TABLE "delivery_rate"
ADD COLUMN "description" TEXT,
ADD COLUMN "minimum_fee" DECIMAL(65, 30),
ADD COLUMN "maximum_fee" DECIMAL(65, 30),
ADD COLUMN "minimum_radius_km" DECIMAL(65, 30),
ADD COLUMN "auto_rounding" TEXT,
ADD COLUMN "dynamic_pricing_enabled" BOOLEAN,
ADD COLUMN "created_at" TIMESTAMP(3),
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "delivery_rate"
SET
    "created_at" = COALESCE("created_at", NOW ()),
    "updated_at" = COALESCE("updated_at", NOW ()),
    "minimum_radius_km" = COALESCE("minimum_radius_km", 1),
    "auto_rounding" = COALESCE("auto_rounding", 'HALF'),
    "dynamic_pricing_enabled" = COALESCE("dynamic_pricing_enabled", true);

-- CreateTable
CREATE TABLE
    "delivery_rate_change_log" (
        "id" UUID NOT NULL,
        "rate_id" UUID,
        "previous_base_fee" DECIMAL(65, 30),
        "new_base_fee" DECIMAL(65, 30),
        "previous_per_km_fee" DECIMAL(65, 30),
        "new_per_km_fee" DECIMAL(65, 30),
        "changed_by" UUID,
        "changed_at" TIMESTAMP(3),
        CONSTRAINT "delivery_rate_change_log_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE INDEX "delivery_rate_change_log_rate_id_changed_at_idx" ON "delivery_rate_change_log" ("rate_id", "changed_at" DESC);

-- AddForeignKey
ALTER TABLE "delivery_rate_change_log" ADD CONSTRAINT "delivery_rate_change_log_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "delivery_rate" ("id") ON DELETE SET NULL ON UPDATE CASCADE;