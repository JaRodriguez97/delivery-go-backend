-- Remove deprecated payment methods and dependent records in development
-- Methods removed: BANK_TRANSFER, NEQUI, DAVIPLATA
DELETE FROM "gateway_event"
WHERE
    "gateway_transaction_id" IN (
        SELECT
            gt."id"
        FROM
            "gateway_transaction" gt
            JOIN "payment" p ON p."id" = gt."payment_id"
            JOIN "payment_method" pm ON pm."id" = p."payment_method_id"
        WHERE
            pm."code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA')
    );

DELETE FROM "gateway_transaction"
WHERE
    "payment_id" IN (
        SELECT
            p."id"
        FROM
            "payment" p
            JOIN "payment_method" pm ON pm."id" = p."payment_method_id"
        WHERE
            pm."code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA')
    );

DELETE FROM "refund"
WHERE
    "payment_id" IN (
        SELECT
            p."id"
        FROM
            "payment" p
            JOIN "payment_method" pm ON pm."id" = p."payment_method_id"
        WHERE
            pm."code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA')
    );

DELETE FROM "payment_reference"
WHERE
    "payment_id" IN (
        SELECT
            p."id"
        FROM
            "payment" p
            JOIN "payment_method" pm ON pm."id" = p."payment_method_id"
        WHERE
            pm."code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA')
    );

DELETE FROM "payment_application"
WHERE
    "payment_id" IN (
        SELECT
            p."id"
        FROM
            "payment" p
            JOIN "payment_method" pm ON pm."id" = p."payment_method_id"
        WHERE
            pm."code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA')
    );

DELETE FROM "payment"
WHERE
    "payment_method_id" IN (
        SELECT
            "id"
        FROM
            "payment_method"
        WHERE
            "code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA')
    );

DELETE FROM "payment_method"
WHERE
    "code" IN ('BANK_TRANSFER', 'NEQUI', 'DAVIPLATA');

INSERT INTO
    "payment_method" (
        "id",
        "code",
        "name",
        "method_type",
        "requires_gateway",
        "allows_installments",
        "status",
        "created_at",
        "updated_at"
    )
VALUES
    (
        'f42a41d1-3f74-4a4e-b8d1-8d5dc4d7a9a1',
        'PSE',
        'PSE (Pagos Seguros en Línea)',
        'ONLINE_GATEWAY',
        true,
        false,
        'ACTIVE',
        NOW (),
        NOW ()
    ) ON CONFLICT ("code") DO
UPDATE
SET
    "name" = EXCLUDED."name",
    "method_type" = EXCLUDED."method_type",
    "requires_gateway" = EXCLUDED."requires_gateway",
    "status" = EXCLUDED."status",
    "updated_at" = NOW ();