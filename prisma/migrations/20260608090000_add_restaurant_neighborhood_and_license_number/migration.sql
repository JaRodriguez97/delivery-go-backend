ALTER TABLE "location_address"
ADD COLUMN IF NOT EXISTS "neighborhood" VARCHAR(100);

ALTER TABLE "restaurant_profile"
ADD COLUMN IF NOT EXISTS "license_number" VARCHAR(100);