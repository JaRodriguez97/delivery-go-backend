-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CC', 'CE', 'PASSPORT', 'TI', 'NIT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "VerificationTokenStatus" AS ENUM ('ACTIVE', 'VERIFIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'WEB', 'TABLET', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_CONFIRM', 'ACCOUNT_LOCK', 'ACCOUNT_UNLOCK', 'VERIFICATION', 'SESSION_REVOKE');

-- CreateEnum
CREATE TYPE "AuditFailureReason" AS ENUM ('INVALID_PASSWORD', 'USER_NOT_FOUND', 'ACCOUNT_LOCKED', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DISCOUNT', 'SURCHARGE', 'MANUAL_CORRECTION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE_GATEWAY', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('BANK_RECEIPT', 'TRANSACTION_CODE', 'AUTH_CODE', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GatewayEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "GatewayTransactionStatus" AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialEntityType" AS ENUM ('INVOICE', 'PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "BusinessDocumentType" AS ENUM ('NIT', 'CC', 'CE', 'PASSPORT');

-- CreateEnum
CREATE TYPE "BusinessEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('PREPAID', 'POSTPAID', 'MIXED');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'INVOICED');

-- CreateEnum
CREATE TYPE "InvoiceScope" AS ENUM ('PERIODIC', 'ADVANCE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SupportDocumentType" AS ENUM ('CONSUMPTION_REPORT', 'ATTENDANCE_CERTIFICATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingRuleType" AS ENUM ('DISCOUNT_PERCENTAGE', 'FIXED_SERVICE_PRICE', 'GRACE_DAYS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RoundingStrategy" AS ENUM ('NONE', 'HALF_UP', 'DOWN', 'UP');

-- CreateEnum
CREATE TYPE "TaxAppliesTo" AS ENUM ('SERVICE', 'PACKAGE', 'INVOICE', 'ALL');

-- CreateEnum
CREATE TYPE "InvoiceSequenceStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'INACTIVE');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "account_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "second_last_name" VARCHAR(100),
    "document_type" "DocumentType" NOT NULL,
    "document_number_encrypted" BYTEA NOT NULL,
    "document_number_hash" CHAR(64) NOT NULL,
    "birth_date" DATE,
    "gender" "Gender",
    "phone" VARCHAR(30),
    "country_code" VARCHAR(10),
    "address" VARCHAR(255),
    "neighborhood" VARCHAR(100),
    "commune" SMALLINT,
    "city" VARCHAR(100),
    "department" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "resource" VARCHAR(100),
    "action" VARCHAR(50),
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(50),
    "device_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "recovery_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "type" "VerificationType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "status" "VerificationTokenStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_uuid" VARCHAR(255) NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "device_name" VARCHAR(100),
    "user_agent" VARCHAR(255),
    "os_name" VARCHAR(50),
    "os_version" VARCHAR(50),
    "app_version" VARCHAR(50),
    "last_used_at" TIMESTAMP(3),
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_audit" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "username_attempt" VARCHAR(150),
    "action" "AuditAction" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" "AuditFailureReason",
    "ip_address" VARCHAR(50),
    "user_agent" VARCHAR(255),
    "device_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" UUID NOT NULL,
    "invoice_sequence_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_type_id" UUID NOT NULL,
    "user_id" UUID,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "subtotal_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issued_at" TIMESTAMP(3),
    "due_date" DATE,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_type" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "invoice_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "subtotal_amount" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_adjustment" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "adjustment_type" "AdjustmentType" NOT NULL,
    "reason" VARCHAR(255),
    "amount" DECIMAL(14,2) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "invoice_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_party" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(50),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "department" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Colombia',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "invoice_party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "payment_method_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "external_reference" VARCHAR(150),
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "method_type" "PaymentMethodType" NOT NULL,
    "requires_gateway" BOOLEAN NOT NULL DEFAULT false,
    "allows_installments" BOOLEAN NOT NULL DEFAULT false,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_application" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "applied_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "payment_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reference" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "reference_number" VARCHAR(100) NOT NULL,
    "reference_type" "ReferenceType" NOT NULL,
    "attachment_url" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "payment_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "refund_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(255),
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_provider" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "environment" "GatewayEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "gateway_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_configuration" (
    "id" UUID NOT NULL,
    "gateway_provider_id" UUID NOT NULL,
    "public_key" VARCHAR(255),
    "private_key" VARCHAR(255),
    "webhook_url" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "gateway_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_transaction" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "gateway_provider_id" UUID NOT NULL,
    "external_transaction_id" VARCHAR(150) NOT NULL,
    "status" "GatewayTransactionStatus" NOT NULL,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "gateway_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_event" (
    "id" UUID NOT NULL,
    "gateway_transaction_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_status_history" (
    "id" UUID NOT NULL,
    "entity_type" "FinancialEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "previous_status" VARCHAR(50),
    "new_status" VARCHAR(50) NOT NULL,
    "changed_by" UUID,
    "change_reason" VARCHAR(255),
    "changed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_trace_log" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_trace_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_entity" (
    "id" UUID NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255),
    "document_type" "BusinessDocumentType" NOT NULL,
    "document_number" VARCHAR(50) NOT NULL,
    "tax_regime" VARCHAR(100),
    "economic_activity_code" VARCHAR(50),
    "contact_email" VARCHAR(150),
    "contact_phone" VARCHAR(50),
    "billing_address" VARCHAR(255),
    "city" VARCHAR(100),
    "department" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Colombia',
    "status" "BusinessEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "business_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_contract" (
    "id" UUID NOT NULL,
    "business_entity_id" UUID NOT NULL,
    "contract_code" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "billing_mode" "BillingMode" NOT NULL,
    "billing_frequency" "BillingFrequency" NOT NULL DEFAULT 'MONTHLY',
    "credit_limit" DECIMAL(14,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "business_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_billing_period" (
    "id" UUID NOT NULL,
    "business_contract_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_consumption_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_invoice_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "BillingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "business_billing_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_consumption_summary" (
    "id" UUID NOT NULL,
    "business_billing_period_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "business_consumption_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_invoice" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "business_contract_id" UUID NOT NULL,
    "business_billing_period_id" UUID,
    "invoice_scope" "InvoiceScope" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "business_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_billing_support_document" (
    "id" UUID NOT NULL,
    "business_invoice_id" UUID NOT NULL,
    "document_type" "SupportDocumentType" NOT NULL,
    "file_url" VARCHAR(255) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "business_billing_support_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_billing_rule" (
    "id" UUID NOT NULL,
    "business_contract_id" UUID NOT NULL,
    "rule_type" "BillingRuleType" NOT NULL,
    "discount_percentage" DECIMAL(5,2),
    "fixed_price" DECIMAL(14,2),
    "grace_days" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "valid_from" DATE,
    "valid_until" DATE,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "business_billing_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_setting" (
    "id" UUID NOT NULL,
    "business_entity_id" UUID,
    "default_currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "default_tax_id" UUID,
    "invoice_due_days" INTEGER NOT NULL DEFAULT 0,
    "allow_negative_invoice" BOOLEAN NOT NULL DEFAULT false,
    "auto_close_billing_period" BOOLEAN NOT NULL DEFAULT true,
    "rounding_strategy" "RoundingStrategy" NOT NULL DEFAULT 'HALF_UP',
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "financial_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "applies_to" "TaxAppliesTo" NOT NULL,
    "is_withholding" BOOLEAN NOT NULL DEFAULT false,
    "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequence" (
    "id" UUID NOT NULL,
    "business_entity_id" UUID NOT NULL,
    "invoice_type_id" UUID NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "current_number" BIGINT NOT NULL DEFAULT 0,
    "min_number" BIGINT,
    "max_number" BIGINT,
    "resolution_number" VARCHAR(100),
    "resolution_date" DATE,
    "resolution_expiration_date" DATE,
    "status" "InvoiceSequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "invoice_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channel" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "notification_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_template" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "channel_id" UUID NOT NULL,
    "subject" VARCHAR(255),
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "version" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "notification_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_setting" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "notification_code" VARCHAR(100) NOT NULL,
    "is_enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "notification_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_device" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_token" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "push_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" UUID,
    "payload" JSONB,
    "status" VARCHAR(50),
    "created_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipient" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID,
    "external_email" VARCHAR(255),
    "external_phone" VARCHAR(50),
    "created_at" TIMESTAMP(3),

    CONSTRAINT "notification_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery" (
    "id" UUID NOT NULL,
    "notification_recipient_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "provider" VARCHAR(100),
    "provider_message_id" VARCHAR(255),
    "status" VARCHAR(50),
    "attempt_count" INTEGER DEFAULT 0,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),

    CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_event" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "entity_type" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "is_system" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "notification_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_event_template" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,

    CONSTRAINT "notification_event_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "category_id" UUID,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_address" (
    "id" UUID NOT NULL,
    "location_id" UUID,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "street" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "geom" geography,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "location_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_category" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "location_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofence_group" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "geofence_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofence" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "group_id" UUID,
    "geom" geometry,
    "radius_meters" INTEGER,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofence_assignment" (
    "id" UUID NOT NULL,
    "geofence_id" UUID,
    "courier_id" UUID,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "geofence_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "courier_id" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" TEXT,

    CONSTRAINT "delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_latest" (
    "delivery_id" UUID NOT NULL,
    "courier_id" UUID,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "geom" geography,
    "speed" DECIMAL(65,30),
    "heading" DECIMAL(65,30),
    "recorded_at" TIMESTAMP(3),

    CONSTRAINT "tracking_latest_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "tracking_history" (
    "id" UUID NOT NULL,
    "delivery_id" UUID,
    "courier_id" UUID,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "geom" geography,
    "speed" DECIMAL(65,30),
    "heading" DECIMAL(65,30),
    "recorded_at" TIMESTAMP(3),

    CONSTRAINT "tracking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spatial_rule" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "trigger_type" TEXT,
    "geofence_id" UUID,
    "is_active" BOOLEAN,

    CONSTRAINT "spatial_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spatial_event_log" (
    "id" UUID NOT NULL,
    "delivery_id" UUID,
    "courier_id" UUID,
    "rule_id" UUID,
    "geofence_id" UUID,
    "event_type" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "occurred_at" TIMESTAMP(3),

    CONSTRAINT "spatial_event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "profile_id" UUID,
    "status_id" UUID,
    "location_id" UUID,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_profile" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "restaurant_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_owner" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "restaurant_owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_schedule" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID,
    "day_of_week" INTEGER,
    "open_time" TIME,
    "close_time" TIME,
    "is_closed" BOOLEAN,

    CONSTRAINT "restaurant_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_status" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "restaurant_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_document" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID,
    "document_type" TEXT,
    "document_url" TEXT,
    "verified" BOOLEAN,
    "uploaded_at" TIMESTAMP(3),

    CONSTRAINT "restaurant_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "profile_id" UUID,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profile" (
    "id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "customer_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contact" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "contact_type" TEXT,
    "value" TEXT,
    "is_primary" BOOLEAN,

    CONSTRAINT "customer_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_address" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "location_id" UUID,
    "label" TEXT,
    "is_default" BOOLEAN,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "customer_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_note" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "customer_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "profile_id" UUID,
    "vehicle_id" UUID,
    "availability_id" UUID,
    "status" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_profile" (
    "id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "courier_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_vehicle" (
    "id" UUID NOT NULL,
    "courier_id" UUID,
    "type" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "plate" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "courier_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_document" (
    "id" UUID NOT NULL,
    "courier_id" UUID,
    "document_type" TEXT,
    "document_url" TEXT,
    "verified" BOOLEAN,
    "uploaded_at" TIMESTAMP(3),

    CONSTRAINT "courier_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_availability" (
    "id" UUID NOT NULL,
    "courier_id" UUID,
    "is_online" BOOLEAN,
    "last_seen" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "courier_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_zone_assignment" (
    "id" UUID NOT NULL,
    "courier_id" UUID,
    "geofence_id" UUID,
    "assigned_at" TIMESTAMP(3),

    CONSTRAINT "courier_zone_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID,
    "customer_id" UUID,
    "delivery_id" UUID,
    "status_id" UUID,
    "priority_id" UUID,
    "total_amount" DECIMAL(65,30),
    "delivery_fee" DECIMAL(65,30),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "name" TEXT,
    "quantity" INTEGER,
    "unit_price" DECIMAL(65,30),
    "total_price" DECIMAL(65,30),
    "note" TEXT,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "order_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "status_id" UUID,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3),

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_note" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "order_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_priority" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "level" INTEGER,
    "description" TEXT,

    CONSTRAINT "order_priority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_assignment" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "courier_id" UUID,
    "assigned_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "status" TEXT,

    CONSTRAINT "order_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_assignment_history" (
    "id" UUID NOT NULL,
    "order_assignment_id" UUID,
    "status" TEXT,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "order_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_dispatch_rule" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "priority" INTEGER,
    "max_distance_km" DECIMAL(65,30),
    "max_orders_per_courier" INTEGER,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "order_dispatch_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_otp" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "otp_code" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),

    CONSTRAINT "order_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_otp_verification" (
    "id" UUID NOT NULL,
    "order_otp_id" UUID,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "success" BOOLEAN,

    CONSTRAINT "order_otp_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_incident" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "incident_type_id" UUID,
    "reported_by" UUID,
    "description" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "order_incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_incident_type" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "order_incident_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_route" (
    "id" UUID NOT NULL,
    "delivery_id" UUID,
    "origin_location_id" UUID,
    "destination_location_id" UUID,
    "distance_km" DECIMAL(65,30),
    "estimated_duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "delivery_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_status" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "delivery_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_status_history" (
    "id" UUID NOT NULL,
    "delivery_id" UUID,
    "status_id" UUID,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3),

    CONSTRAINT "delivery_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proof" (
    "id" UUID NOT NULL,
    "delivery_id" UUID,
    "proof_type" TEXT,
    "file_url" TEXT,
    "captured_at" TIMESTAMP(3),

    CONSTRAINT "delivery_proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_rate" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "base_fee" DECIMAL(65,30),
    "per_km_fee" DECIMAL(65,30),
    "currency" TEXT,
    "is_active" BOOLEAN,

    CONSTRAINT "delivery_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_rate_rule" (
    "id" UUID NOT NULL,
    "rate_id" UUID,
    "geofence_id" UUID,
    "min_distance_km" DECIMAL(65,30),
    "max_distance_km" DECIMAL(65,30),
    "multiplier" DECIMAL(65,30),
    "created_at" TIMESTAMP(3),

    CONSTRAINT "delivery_rate_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_fee" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "rate_id" UUID,
    "calculated_fee" DECIMAL(65,30),
    "calculated_at" TIMESTAMP(3),

    CONSTRAINT "delivery_fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_distance_calculation" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "origin_location_id" UUID,
    "destination_location_id" UUID,
    "distance_km" DECIMAL(65,30),
    "duration_minutes" INTEGER,
    "calculated_at" TIMESTAMP(3),

    CONSTRAINT "delivery_distance_calculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "order_id" UUID,
    "subject" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_event" (
    "id" UUID NOT NULL,
    "ticket_id" UUID,
    "event_type" TEXT,
    "message" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "support_ticket_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_id_key" ON "user_profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_document_number_hash_key" ON "user_profile"("document_number_hash");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_name_key" ON "permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_token_token_key" ON "recovery_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_token_key" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_device_device_uuid_key" ON "user_device"("device_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_type_code_key" ON "invoice_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_party_invoice_id_key" ON "invoice_party"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_payment_number_key" ON "payment"("payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_code_key" ON "payment_method"("code");

-- CreateIndex
CREATE UNIQUE INDEX "refund_refund_number_key" ON "refund"("refund_number");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_provider_code_key" ON "gateway_provider"("code");

-- CreateIndex
CREATE UNIQUE INDEX "business_entity_document_number_key" ON "business_entity"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "business_contract_contract_code_key" ON "business_contract"("contract_code");

-- CreateIndex
CREATE UNIQUE INDEX "business_invoice_invoice_id_key" ON "business_invoice"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_code_key" ON "tax"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_code_key" ON "notification_channel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_code_channel_id_key" ON "notification_template"("code", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_setting_user_id_channel_id_notification_code_key" ON "notification_setting"("user_id", "channel_id", "notification_code");

-- CreateIndex
CREATE UNIQUE INDEX "push_device_device_token_key" ON "push_device"("device_token");

-- CreateIndex
CREATE UNIQUE INDEX "notification_event_code_key" ON "notification_event"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_event_template_event_id_template_id_key" ON "notification_event_template"("event_id", "template_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_delivery_id_key" ON "order"("delivery_id");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_token" ADD CONSTRAINT "recovery_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_token" ADD CONSTRAINT "verification_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device" ADD CONSTRAINT "user_device_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_audit" ADD CONSTRAINT "access_audit_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_invoice_sequence_id_fkey" FOREIGN KEY ("invoice_sequence_id") REFERENCES "invoice_sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_invoice_type_id_fkey" FOREIGN KEY ("invoice_type_id") REFERENCES "invoice_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustment" ADD CONSTRAINT "invoice_adjustment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_adjustment" ADD CONSTRAINT "invoice_adjustment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_party" ADD CONSTRAINT "invoice_party_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_application" ADD CONSTRAINT "payment_application_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_application" ADD CONSTRAINT "payment_application_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reference" ADD CONSTRAINT "payment_reference_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_configuration" ADD CONSTRAINT "gateway_configuration_gateway_provider_id_fkey" FOREIGN KEY ("gateway_provider_id") REFERENCES "gateway_provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_transaction" ADD CONSTRAINT "gateway_transaction_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_transaction" ADD CONSTRAINT "gateway_transaction_gateway_provider_id_fkey" FOREIGN KEY ("gateway_provider_id") REFERENCES "gateway_provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_event" ADD CONSTRAINT "gateway_event_gateway_transaction_id_fkey" FOREIGN KEY ("gateway_transaction_id") REFERENCES "gateway_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_status_history" ADD CONSTRAINT "financial_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_trace_log" ADD CONSTRAINT "financial_trace_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_contract" ADD CONSTRAINT "business_contract_business_entity_id_fkey" FOREIGN KEY ("business_entity_id") REFERENCES "business_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_contract" ADD CONSTRAINT "business_contract_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_billing_period" ADD CONSTRAINT "business_billing_period_business_contract_id_fkey" FOREIGN KEY ("business_contract_id") REFERENCES "business_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_consumption_summary" ADD CONSTRAINT "business_consumption_summary_business_billing_period_id_fkey" FOREIGN KEY ("business_billing_period_id") REFERENCES "business_billing_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invoice" ADD CONSTRAINT "business_invoice_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invoice" ADD CONSTRAINT "business_invoice_business_contract_id_fkey" FOREIGN KEY ("business_contract_id") REFERENCES "business_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invoice" ADD CONSTRAINT "business_invoice_business_billing_period_id_fkey" FOREIGN KEY ("business_billing_period_id") REFERENCES "business_billing_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_billing_support_document" ADD CONSTRAINT "business_billing_support_document_business_invoice_id_fkey" FOREIGN KEY ("business_invoice_id") REFERENCES "business_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_billing_rule" ADD CONSTRAINT "business_billing_rule_business_contract_id_fkey" FOREIGN KEY ("business_contract_id") REFERENCES "business_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_setting" ADD CONSTRAINT "financial_setting_business_entity_id_fkey" FOREIGN KEY ("business_entity_id") REFERENCES "business_entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_setting" ADD CONSTRAINT "financial_setting_default_tax_id_fkey" FOREIGN KEY ("default_tax_id") REFERENCES "tax"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequence" ADD CONSTRAINT "invoice_sequence_business_entity_id_fkey" FOREIGN KEY ("business_entity_id") REFERENCES "business_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequence" ADD CONSTRAINT "invoice_sequence_invoice_type_id_fkey" FOREIGN KEY ("invoice_type_id") REFERENCES "invoice_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template" ADD CONSTRAINT "notification_template_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "notification_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_setting" ADD CONSTRAINT "notification_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_setting" ADD CONSTRAINT "notification_setting_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "notification_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_device" ADD CONSTRAINT "push_device_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipient" ADD CONSTRAINT "notification_recipient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_notification_recipient_id_fkey" FOREIGN KEY ("notification_recipient_id") REFERENCES "notification_recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "notification_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_event_template" ADD CONSTRAINT "notification_event_template_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "notification_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_event_template" ADD CONSTRAINT "notification_event_template_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "location_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_address" ADD CONSTRAINT "location_address_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofence" ADD CONSTRAINT "geofence_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "geofence_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geofence_assignment" ADD CONSTRAINT "geofence_assignment_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_latest" ADD CONSTRAINT "tracking_latest_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_history" ADD CONSTRAINT "tracking_history_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_rule" ADD CONSTRAINT "spatial_rule_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_event_log" ADD CONSTRAINT "spatial_event_log_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_event_log" ADD CONSTRAINT "spatial_event_log_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "spatial_rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_event_log" ADD CONSTRAINT "spatial_event_log_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "restaurant_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "restaurant_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "restaurant_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_schedule" ADD CONSTRAINT "restaurant_schedule_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_document" ADD CONSTRAINT "restaurant_document_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contact" ADD CONSTRAINT "customer_contact_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier" ADD CONSTRAINT "courier_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "courier_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier" ADD CONSTRAINT "courier_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "courier_vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier" ADD CONSTRAINT "courier_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "courier_availability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_vehicle" ADD CONSTRAINT "courier_vehicle_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_document" ADD CONSTRAINT "courier_document_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_zone_assignment" ADD CONSTRAINT "courier_zone_assignment_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_zone_assignment" ADD CONSTRAINT "courier_zone_assignment_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "order_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "order_priority"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "order_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_note" ADD CONSTRAINT "order_note_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_assignment" ADD CONSTRAINT "order_assignment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_assignment" ADD CONSTRAINT "order_assignment_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_assignment_history" ADD CONSTRAINT "order_assignment_history_order_assignment_id_fkey" FOREIGN KEY ("order_assignment_id") REFERENCES "order_assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_otp" ADD CONSTRAINT "order_otp_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_otp_verification" ADD CONSTRAINT "order_otp_verification_order_otp_id_fkey" FOREIGN KEY ("order_otp_id") REFERENCES "order_otp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_incident" ADD CONSTRAINT "order_incident_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_incident" ADD CONSTRAINT "order_incident_incident_type_id_fkey" FOREIGN KEY ("incident_type_id") REFERENCES "order_incident_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_route" ADD CONSTRAINT "delivery_route_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_route" ADD CONSTRAINT "delivery_route_origin_location_id_fkey" FOREIGN KEY ("origin_location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_route" ADD CONSTRAINT "delivery_route_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "delivery_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proof" ADD CONSTRAINT "delivery_proof_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_rate_rule" ADD CONSTRAINT "delivery_rate_rule_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "delivery_rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_rate_rule" ADD CONSTRAINT "delivery_rate_rule_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_fee" ADD CONSTRAINT "delivery_fee_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_fee" ADD CONSTRAINT "delivery_fee_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "delivery_rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_distance_calculation" ADD CONSTRAINT "delivery_distance_calculation_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_distance_calculation" ADD CONSTRAINT "delivery_distance_calculation_origin_location_id_fkey" FOREIGN KEY ("origin_location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_distance_calculation" ADD CONSTRAINT "delivery_distance_calculation_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_event" ADD CONSTRAINT "support_ticket_event_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
