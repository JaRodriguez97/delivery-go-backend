-- CreateTable
CREATE TABLE
    "system_setting" (
        "id" UUID NOT NULL,
        "key" VARCHAR(50) NOT NULL,
        "operation_city" VARCHAR(150) NOT NULL DEFAULT 'Cali, Valle del Cauca',
        "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/Bogota',
        "language" VARCHAR(10) NOT NULL DEFAULT 'es',
        "logo_url" VARCHAR(255),
        "platform_commission_percent" DECIMAL(5, 2) NOT NULL DEFAULT 15,
        "fixed_commission_per_order" DECIMAL(14, 2) NOT NULL DEFAULT 0,
        "differentiated_commission_by_restaurant" BOOLEAN NOT NULL DEFAULT false,
        "withhold_rider_automatically" BOOLEAN NOT NULL DEFAULT true,
        "settlement_method" VARCHAR(20) NOT NULL DEFAULT 'AUTOMATIC',
        "created_at" TIMESTAMP(3) NOT NULL,
        "updated_at" TIMESTAMP(3),
        CONSTRAINT "system_setting_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "system_setting_key_key" ON "system_setting" ("key");