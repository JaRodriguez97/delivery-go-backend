-- Enforce restaurant status integrity:
-- 1) Remove legacy/inconsistent values
-- 2) Backfill missing restaurant.status_id
-- 3) Enforce NOT NULL + UNIQUE + FK RESTRICT
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Normalize any unknown status name to canonical pending status.
UPDATE "restaurant_status"
SET
    "name" = 'PENDING',
    "description" = COALESCE("description", 'Pendiente de Revisión')
WHERE
    "name" IS NOT NULL
    AND UPPER("name") NOT IN ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Ensure required statuses exist.
INSERT INTO
    "restaurant_status" ("id", "name", "description")
SELECT
    gen_random_uuid (),
    'PENDING',
    'Pendiente de Revisión'
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            "restaurant_status"
        WHERE
            "name" = 'PENDING'
    );

INSERT INTO
    "restaurant_status" ("id", "name", "description")
SELECT
    gen_random_uuid (),
    'ACTIVE',
    'Restaurante activo y operando'
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            "restaurant_status"
        WHERE
            "name" = 'ACTIVE'
    );

INSERT INTO
    "restaurant_status" ("id", "name", "description")
SELECT
    gen_random_uuid (),
    'INACTIVE',
    'Restaurante temporalmente inactivo'
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            "restaurant_status"
        WHERE
            "name" = 'INACTIVE'
    );

-- Backfill restaurants without status.
UPDATE "restaurant" r
SET
    "status_id" = s."id"
FROM
    (
        SELECT
            "id"
        FROM
            "restaurant_status"
        WHERE
            "name" = 'PENDING'
        ORDER BY
            "id"
        LIMIT
            1
    ) s
WHERE
    r."status_id" IS NULL;

-- Repoint restaurants linked to unnamed statuses.
UPDATE "restaurant" r
SET
    "status_id" = s."id"
FROM
    "restaurant_status" rs,
    (
        SELECT
            "id"
        FROM
            "restaurant_status"
        WHERE
            "name" = 'PENDING'
        ORDER BY
            "id"
        LIMIT
            1
    ) s
WHERE
    r."status_id" = rs."id"
    AND rs."name" IS NULL;

-- Merge duplicates by name before creating unique constraint.
WITH
    ranked AS (
        SELECT
            "id",
            "name",
            ROW_NUMBER() OVER (
                PARTITION BY
                    "name"
                ORDER BY
                    "id"
            ) AS rn,
            FIRST_VALUE ("id") OVER (
                PARTITION BY
                    "name"
                ORDER BY
                    "id"
            ) AS keep_id
        FROM
            "restaurant_status"
        WHERE
            "name" IS NOT NULL
    )
UPDATE "restaurant" r
SET
    "status_id" = ranked.keep_id
FROM
    ranked
WHERE
    r."status_id" = ranked."id"
    AND ranked.rn > 1;

WITH
    ranked AS (
        SELECT
            "id",
            "name",
            ROW_NUMBER() OVER (
                PARTITION BY
                    "name"
                ORDER BY
                    "id"
            ) AS rn
        FROM
            "restaurant_status"
        WHERE
            "name" IS NOT NULL
    )
DELETE FROM "restaurant_status" rs USING ranked
WHERE
    rs."id" = ranked."id"
    AND ranked.rn > 1;

-- Enforce strict constraints.
ALTER TABLE "restaurant_status"
ALTER COLUMN "name"
SET
    NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_status_name_key" ON "restaurant_status" ("name");

ALTER TABLE "restaurant"
ALTER COLUMN "status_id"
SET
    NOT NULL;

ALTER TABLE "restaurant"
DROP CONSTRAINT IF EXISTS "restaurant_status_id_fkey";

ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "restaurant_status" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;