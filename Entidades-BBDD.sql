CREATE TABLE "user" (
  "id" uuid PRIMARY KEY,
  "email" varchar(150) UNIQUE NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "status" "enum(ACTIVE,INACTIVE,SUSPENDED,PENDING)" NOT NULL DEFAULT 'ACTIVE',
  "email_verified" boolean NOT NULL DEFAULT false,
  "account_locked" boolean NOT NULL DEFAULT false,
  "locked_until" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "verified_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "user_profile" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid UNIQUE NOT NULL,
  "first_name" varchar(100) NOT NULL,
  "middle_name" varchar(100),
  "last_name" varchar(100) NOT NULL,
  "second_last_name" varchar(100),
  "document_type" "enum(CC,CE,PASSPORT,TI,NIT)" NOT NULL,
  "document_number_encrypted" bytea NOT NULL,
  "document_number_hash" char(64) UNIQUE NOT NULL,
  "birth_date" date,
  "gender" "enum(MALE,FEMALE)",
  "phone" varchar(30),
  "country_code" varchar(10),
  "address" varchar(255),
  "neighborhood" varchar(100),
  "commune" smallint,
  "city" varchar(100),
  "department" varchar(100),
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "role" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "permission" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) UNIQUE NOT NULL,
  "description" text,
  "resource" varchar(100),
  "action" varchar(50),
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "role_permission" (
  "id" uuid PRIMARY KEY,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "assigned_at" timestamp NOT NULL,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamp
);

CREATE TABLE "user_role" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "assigned_at" timestamp NOT NULL,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamp
);

CREATE TABLE "session" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "token" varchar(255) UNIQUE NOT NULL,
  "ip_address" varchar(50),
  "device_id" uuid,
  "created_at" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "status" "enum(ACTIVE,EXPIRED,REVOKED)" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "recovery_token" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "token" varchar(255) UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "status" "enum(ACTIVE,USED,EXPIRED)" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "verification_token" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "token" varchar(255) UNIQUE NOT NULL,
  "type" "enum(EMAIL,PHONE)" NOT NULL,
  "created_at" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "verified_at" timestamp,
  "status" "enum(ACTIVE,VERIFIED,EXPIRED)" NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE "user_device" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "device_uuid" varchar(255) UNIQUE NOT NULL,
  "device_type" "enum(MOBILE,WEB,TABLET,OTHER)" NOT NULL,
  "device_name" varchar(100),
  "user_agent" varchar(255),
  "os_name" varchar(50),
  "os_version" varchar(50),
  "app_version" varchar(50),
  "last_used_at" timestamp,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "access_audit" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "username_attempt" varchar(150),
  "action" "enum(LOGIN,LOGOUT,PASSWORD_RESET_REQUEST,PASSWORD_RESET_CONFIRM,ACCOUNT_LOCK,ACCOUNT_UNLOCK,VERIFICATION,SESSION_REVOKE)" NOT NULL,
  "success" boolean NOT NULL DEFAULT false,
  "failure_reason" "enum(INVALID_PASSWORD,USER_NOT_FOUND,ACCOUNT_LOCKED,TOKEN_EXPIRED,INVALID_TOKEN,UNKNOWN)",
  "ip_address" varchar(50),
  "user_agent" varchar(255),
  "device_id" uuid,
  "occurred_at" timestamp NOT NULL
);

CREATE TABLE "invoice" (
  "id" uuid PRIMARY KEY,
  "invoice_sequence_id" uuid NOT NULL,
  "invoice_number" varchar(50) NOT NULL,
  "invoice_type_id" uuid NOT NULL,
  "user_id" uuid,
  "currency" varchar(10) NOT NULL DEFAULT 'COP',
  "subtotal_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "discount_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "total_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "status" "enum(DRAFT,ISSUED,PARTIALLY_PAID,PAID,CANCELLED,VOIDED)" NOT NULL DEFAULT 'DRAFT',
  "issued_at" timestamp,
  "due_date" date,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "invoice_type" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "invoice_item" (
  "id" uuid PRIMARY KEY,
  "invoice_id" uuid NOT NULL,
  "description" varchar(255) NOT NULL,
  "quantity" int NOT NULL DEFAULT 1,
  "unit_price" numeric(14,2) NOT NULL,
  "subtotal_amount" numeric(14,2) NOT NULL,
  "discount_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "total_amount" numeric(14,2) NOT NULL,
  "sort_order" int,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "invoice_adjustment" (
  "id" uuid PRIMARY KEY,
  "invoice_id" uuid NOT NULL,
  "adjustment_type" "enum(DISCOUNT,SURCHARGE,MANUAL_CORRECTION)" NOT NULL,
  "reason" varchar(255),
  "amount" numeric(14,2) NOT NULL,
  "created_by" uuid,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "invoice_party" (
  "id" uuid PRIMARY KEY,
  "invoice_id" uuid UNIQUE NOT NULL,
  "document_type" "enum(CC,CE,PASSPORT,TI,NIT)" NOT NULL,
  "document_number" varchar(50) NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "email" varchar(150),
  "phone" varchar(50),
  "address" varchar(255),
  "city" varchar(100),
  "department" varchar(100),
  "country" varchar(100) DEFAULT 'Colombia',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "payment" (
  "id" uuid PRIMARY KEY,
  "payment_number" varchar(50) UNIQUE NOT NULL,
  "invoice_id" uuid NOT NULL,
  "payment_method_id" uuid NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'COP',
  "status" "enum(PENDING,PROCESSING,COMPLETED,FAILED,CANCELLED,REFUNDED,PARTIALLY_REFUNDED)" NOT NULL DEFAULT 'PENDING',
  "paid_at" timestamp,
  "failed_at" timestamp,
  "external_reference" varchar(150),
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "payment_method" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "method_type" "enum(CASH,CARD,BANK_TRANSFER,ONLINE_GATEWAY,CORPORATE,OTHER)" NOT NULL,
  "requires_gateway" boolean NOT NULL DEFAULT false,
  "allows_installments" boolean NOT NULL DEFAULT false,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "payment_application" (
  "id" uuid PRIMARY KEY,
  "payment_id" uuid NOT NULL,
  "invoice_id" uuid NOT NULL,
  "applied_amount" numeric(14,2) NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "payment_reference" (
  "id" uuid PRIMARY KEY,
  "payment_id" uuid NOT NULL,
  "reference_number" varchar(100) NOT NULL,
  "reference_type" "enum(BANK_RECEIPT,TRANSACTION_CODE,AUTH_CODE,OTHER)" NOT NULL,
  "attachment_url" varchar(255),
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "refund" (
  "id" uuid PRIMARY KEY,
  "payment_id" uuid NOT NULL,
  "refund_number" varchar(50) UNIQUE NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "reason" varchar(255),
  "status" "enum(PENDING,PROCESSED,FAILED,CANCELLED)" NOT NULL DEFAULT 'PENDING',
  "processed_at" timestamp,
  "created_by" uuid,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "gateway_provider" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "environment" "enum(SANDBOX,PRODUCTION)" NOT NULL DEFAULT 'SANDBOX',
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "gateway_configuration" (
  "id" uuid PRIMARY KEY,
  "gateway_provider_id" uuid NOT NULL,
  "public_key" varchar(255),
  "private_key" varchar(255),
  "webhook_url" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "gateway_transaction" (
  "id" uuid PRIMARY KEY,
  "payment_id" uuid NOT NULL,
  "gateway_provider_id" uuid NOT NULL,
  "external_transaction_id" varchar(150) NOT NULL,
  "status" "enum(CREATED,PENDING,APPROVED,DECLINED,ERROR,CANCELLED)" NOT NULL,
  "request_payload" jsonb,
  "response_payload" jsonb,
  "processed_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "gateway_event" (
  "id" uuid PRIMARY KEY,
  "gateway_transaction_id" uuid NOT NULL,
  "event_type" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "received_at" timestamp NOT NULL,
  "processed" boolean NOT NULL DEFAULT false,
  "processed_at" timestamp,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "financial_status_history" (
  "id" uuid PRIMARY KEY,
  "entity_type" "enum(INVOICE,PAYMENT,REFUND)" NOT NULL,
  "entity_id" uuid NOT NULL,
  "previous_status" varchar(50),
  "new_status" varchar(50) NOT NULL,
  "changed_by" uuid,
  "change_reason" varchar(255),
  "changed_at" timestamp NOT NULL
);

CREATE TABLE "financial_trace_log" (
  "id" uuid PRIMARY KEY,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" uuid NOT NULL,
  "action" varchar(100) NOT NULL,
  "metadata" jsonb,
  "created_by" uuid,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "business_entity" (
  "id" uuid PRIMARY KEY,
  "legal_name" varchar(255) NOT NULL,
  "trade_name" varchar(255),
  "document_type" "enum(NIT,CC,CE,PASSPORT)" NOT NULL,
  "document_number" varchar(50) UNIQUE NOT NULL,
  "tax_regime" varchar(100),
  "economic_activity_code" varchar(50),
  "contact_email" varchar(150),
  "contact_phone" varchar(50),
  "billing_address" varchar(255),
  "city" varchar(100),
  "department" varchar(100),
  "country" varchar(100) NOT NULL DEFAULT 'Colombia',
  "status" "enum(ACTIVE,INACTIVE,SUSPENDED)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "business_contract" (
  "id" uuid PRIMARY KEY,
  "business_entity_id" uuid NOT NULL,
  "contract_code" varchar(50) UNIQUE NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "billing_mode" "enum(PREPAID,POSTPAID,MIXED)" NOT NULL,
  "billing_frequency" "enum(MONTHLY,BIWEEKLY,WEEKLY,CUSTOM)" NOT NULL DEFAULT 'MONTHLY',
  "credit_limit" numeric(14,2),
  "currency" varchar(10) NOT NULL DEFAULT 'COP',
  "status" "enum(ACTIVE,SUSPENDED,TERMINATED,EXPIRED)" NOT NULL DEFAULT 'ACTIVE',
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE "business_billing_period" (
  "id" uuid PRIMARY KEY,
  "business_contract_id" uuid NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "total_consumption_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "total_invoice_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "status" "enum(OPEN,CLOSED,INVOICED)" NOT NULL DEFAULT 'OPEN',
  "closed_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "business_consumption_summary" (
  "id" uuid PRIMARY KEY,
  "business_billing_period_id" uuid NOT NULL,
  "quantity" int NOT NULL DEFAULT 0,
  "unit_price" numeric(14,2) NOT NULL,
  "total_amount" numeric(14,2) NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "business_invoice" (
  "id" uuid PRIMARY KEY,
  "invoice_id" uuid UNIQUE NOT NULL,
  "business_contract_id" uuid NOT NULL,
  "business_billing_period_id" uuid,
  "invoice_scope" "enum(PERIODIC,ADVANCE,ADJUSTMENT)" NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "business_billing_support_document" (
  "id" uuid PRIMARY KEY,
  "business_invoice_id" uuid NOT NULL,
  "document_type" "enum(CONSUMPTION_REPORT,ATTENDANCE_CERTIFICATE,CUSTOM)" NOT NULL,
  "file_url" varchar(255) NOT NULL,
  "generated_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "business_billing_rule" (
  "id" uuid PRIMARY KEY,
  "business_contract_id" uuid NOT NULL,
  "rule_type" "enum(DISCOUNT_PERCENTAGE,FIXED_SERVICE_PRICE,GRACE_DAYS,CUSTOM)" NOT NULL,
  "discount_percentage" numeric(5,2),
  "fixed_price" numeric(14,2),
  "grace_days" int,
  "priority" int NOT NULL DEFAULT 1,
  "valid_from" date,
  "valid_until" date,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "financial_setting" (
  "id" uuid PRIMARY KEY,
  "business_entity_id" uuid,
  "default_currency" varchar(10) NOT NULL DEFAULT 'COP',
  "default_tax_id" uuid,
  "invoice_due_days" int NOT NULL DEFAULT 0,
  "allow_negative_invoice" boolean NOT NULL DEFAULT false,
  "auto_close_billing_period" boolean NOT NULL DEFAULT true,
  "rounding_strategy" "enum(NONE,HALF_UP,DOWN,UP)" NOT NULL DEFAULT 'HALF_UP',
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "tax" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "percentage" numeric(5,2) NOT NULL,
  "applies_to" "enum(SERVICE,PACKAGE,INVOICE,ALL)" NOT NULL,
  "is_withholding" boolean NOT NULL DEFAULT false,
  "status" "enum(ACTIVE,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "invoice_sequence" (
  "id" uuid PRIMARY KEY,
  "business_entity_id" uuid NOT NULL,
  "invoice_type_id" uuid NOT NULL,
  "prefix" varchar(20) NOT NULL,
  "current_number" bigint NOT NULL DEFAULT 0,
  "min_number" bigint,
  "max_number" bigint,
  "resolution_number" varchar(100),
  "resolution_date" date,
  "resolution_expiration_date" date,
  "status" "enum(ACTIVE,EXHAUSTED,EXPIRED,INACTIVE)" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp
);

CREATE TABLE "notification_channel" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "notification_template" (
  "id" uuid PRIMARY KEY,
  "code" varchar(100) NOT NULL,
  "channel_id" uuid NOT NULL,
  "subject" varchar(255),
  "body" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "version" int DEFAULT 1,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "notification_setting" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "notification_code" varchar(100) NOT NULL,
  "is_enabled" boolean DEFAULT true,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "push_device" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "device_token" varchar(255) NOT NULL,
  "platform" varchar(50),
  "is_active" boolean DEFAULT true,
  "last_used_at" timestamp,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "notification" (
  "id" uuid PRIMARY KEY,
  "code" varchar(100) NOT NULL,
  "entity_type" varchar(100),
  "entity_id" uuid,
  "payload" jsonb,
  "status" varchar(50),
  "created_at" timestamp,
  "processed_at" timestamp
);

CREATE TABLE "notification_recipient" (
  "id" uuid PRIMARY KEY,
  "notification_id" uuid NOT NULL,
  "user_id" uuid,
  "external_email" varchar(255),
  "external_phone" varchar(50),
  "created_at" timestamp
);

CREATE TABLE "notification_delivery" (
  "id" uuid PRIMARY KEY,
  "notification_recipient_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "provider" varchar(100),
  "provider_message_id" varchar(255),
  "status" varchar(50),
  "attempt_count" int DEFAULT 0,
  "error_message" text,
  "sent_at" timestamp,
  "delivered_at" timestamp,
  "read_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "notification_event" (
  "id" uuid PRIMARY KEY,
  "code" varchar(100) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "description" text,
  "entity_type" varchar(100),
  "is_active" boolean DEFAULT true,
  "is_system" boolean DEFAULT true,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "notification_event_template" (
  "id" uuid PRIMARY KEY,
  "event_id" uuid NOT NULL,
  "template_id" uuid NOT NULL
);

CREATE TABLE "location" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text,
  "category_id" uuid,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "location_address" (
  "id" uuid PRIMARY KEY,
  "location_id" uuid,
  "country" varchar,
  "state" varchar,
  "city" varchar,
  "street" varchar,
  "postal_code" varchar,
  "latitude" decimal,
  "longitude" decimal,
  "geom" geography,
  "created_at" timestamp
);

CREATE TABLE "location_category" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text
);

CREATE TABLE "geofence_group" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text
);

CREATE TABLE "geofence" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text,
  "group_id" uuid,
  "geom" geometry,
  "radius_meters" integer,
  "created_at" timestamp
);

CREATE TABLE "geofence_assignment" (
  "id" uuid PRIMARY KEY,
  "geofence_id" uuid,
  "courier_id" uuid,
  "created_at" timestamp
);

CREATE TABLE "delivery" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "courier_id" uuid,
  "started_at" timestamp,
  "completed_at" timestamp,
  "status" varchar
);

CREATE TABLE "tracking_latest" (
  "delivery_id" uuid PRIMARY KEY,
  "courier_id" uuid,
  "latitude" decimal,
  "longitude" decimal,
  "geom" geography,
  "speed" decimal,
  "heading" decimal,
  "recorded_at" timestamp
);

CREATE TABLE "tracking_history" (
  "id" uuid PRIMARY KEY,
  "delivery_id" uuid,
  "courier_id" uuid,
  "latitude" decimal,
  "longitude" decimal,
  "geom" geography,
  "speed" decimal,
  "heading" decimal,
  "recorded_at" timestamp
);

CREATE TABLE "spatial_rule" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text,
  "trigger_type" varchar,
  "geofence_id" uuid,
  "is_active" boolean
);

CREATE TABLE "spatial_event_log" (
  "id" uuid PRIMARY KEY,
  "delivery_id" uuid,
  "courier_id" uuid,
  "rule_id" uuid,
  "geofence_id" uuid,
  "event_type" varchar,
  "latitude" decimal,
  "longitude" decimal,
  "occurred_at" timestamp
);

CREATE TABLE "restaurant" (
  "id" uuid PRIMARY KEY,
  "owner_id" uuid,
  "profile_id" uuid,
  "status_id" uuid,
  "location_id" uuid,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "restaurant_profile" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text,
  "phone" varchar,
  "email" varchar,
  "logo_url" varchar,
  "created_at" timestamp
);

CREATE TABLE "restaurant_owner" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "first_name" varchar,
  "last_name" varchar,
  "phone" varchar,
  "email" varchar,
  "created_at" timestamp
);

CREATE TABLE "restaurant_schedule" (
  "id" uuid PRIMARY KEY,
  "restaurant_id" uuid,
  "day_of_week" integer,
  "open_time" time,
  "close_time" time,
  "is_closed" boolean
);

CREATE TABLE "restaurant_status" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text
);

CREATE TABLE "restaurant_document" (
  "id" uuid PRIMARY KEY,
  "restaurant_id" uuid,
  "document_type" varchar,
  "document_url" varchar,
  "verified" boolean,
  "uploaded_at" timestamp
);

CREATE TABLE "customer" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "profile_id" uuid,
  "created_at" timestamp
);

CREATE TABLE "customer_profile" (
  "id" uuid PRIMARY KEY,
  "first_name" varchar,
  "last_name" varchar,
  "phone" varchar,
  "email" varchar,
  "created_at" timestamp
);

CREATE TABLE "customer_contact" (
  "id" uuid PRIMARY KEY,
  "customer_id" uuid,
  "contact_type" varchar,
  "value" varchar,
  "is_primary" boolean
);

CREATE TABLE "customer_address" (
  "id" uuid PRIMARY KEY,
  "customer_id" uuid,
  "location_id" uuid,
  "label" varchar,
  "is_default" boolean,
  "created_at" timestamp
);

CREATE TABLE "customer_note" (
  "id" uuid PRIMARY KEY,
  "customer_id" uuid,
  "note" text,
  "created_at" timestamp
);

CREATE TABLE "courier" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "profile_id" uuid,
  "vehicle_id" uuid,
  "availability_id" uuid,
  "status" varchar,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "courier_profile" (
  "id" uuid PRIMARY KEY,
  "first_name" varchar,
  "last_name" varchar,
  "phone" varchar,
  "email" varchar,
  "photo_url" varchar,
  "created_at" timestamp
);

CREATE TABLE "courier_vehicle" (
  "id" uuid PRIMARY KEY,
  "courier_id" uuid,
  "type" varchar,
  "brand" varchar,
  "model" varchar,
  "plate" varchar,
  "color" varchar,
  "created_at" timestamp
);

CREATE TABLE "courier_document" (
  "id" uuid PRIMARY KEY,
  "courier_id" uuid,
  "document_type" varchar,
  "document_url" varchar,
  "verified" boolean,
  "uploaded_at" timestamp
);

CREATE TABLE "courier_availability" (
  "id" uuid PRIMARY KEY,
  "courier_id" uuid,
  "is_online" boolean,
  "last_seen" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "courier_zone_assignment" (
  "id" uuid PRIMARY KEY,
  "courier_id" uuid,
  "geofence_id" uuid,
  "assigned_at" timestamp
);

CREATE TABLE "order" (
  "id" uuid PRIMARY KEY,
  "restaurant_id" uuid,
  "customer_id" uuid,
  "delivery_id" uuid,
  "status_id" uuid,
  "priority_id" uuid,
  "total_amount" decimal,
  "delivery_fee" decimal,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "order_item" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "name" varchar,
  "quantity" integer,
  "unit_price" decimal,
  "total_price" decimal,
  "note" text
);

CREATE TABLE "order_status" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text
);

CREATE TABLE "order_status_history" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "status_id" uuid,
  "changed_by" uuid,
  "changed_at" timestamp
);

CREATE TABLE "order_note" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "note" text,
  "created_by" uuid,
  "created_at" timestamp
);

CREATE TABLE "order_priority" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "level" integer,
  "description" text
);

CREATE TABLE "order_assignment" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "courier_id" uuid,
  "assigned_at" timestamp,
  "accepted_at" timestamp,
  "rejected_at" timestamp,
  "status" varchar
);

CREATE TABLE "order_assignment_history" (
  "id" uuid PRIMARY KEY,
  "order_assignment_id" uuid,
  "status" varchar,
  "changed_by" uuid,
  "changed_at" timestamp,
  "note" text
);

CREATE TABLE "order_dispatch_rule" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text,
  "priority" integer,
  "max_distance_km" decimal,
  "max_orders_per_courier" integer,
  "is_active" boolean,
  "created_at" timestamp
);

CREATE TABLE "delivery_route" (
  "id" uuid PRIMARY KEY,
  "delivery_id" uuid,
  "origin_location_id" uuid,
  "destination_location_id" uuid,
  "distance_km" decimal,
  "estimated_duration_minutes" integer,
  "created_at" timestamp
);

CREATE TABLE "delivery_status" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text
);

CREATE TABLE "delivery_status_history" (
  "id" uuid PRIMARY KEY,
  "delivery_id" uuid,
  "status_id" uuid,
  "changed_by" uuid,
  "changed_at" timestamp
);

CREATE TABLE "delivery_proof" (
  "id" uuid PRIMARY KEY,
  "delivery_id" uuid,
  "proof_type" varchar,
  "file_url" varchar,
  "captured_at" timestamp
);

CREATE TABLE "delivery_rate" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "base_fee" decimal,
  "per_km_fee" decimal,
  "currency" varchar,
  "is_active" boolean
);

CREATE TABLE "delivery_rate_rule" (
  "id" uuid PRIMARY KEY,
  "rate_id" uuid,
  "geofence_id" uuid,
  "min_distance_km" decimal,
  "max_distance_km" decimal,
  "multiplier" decimal,
  "created_at" timestamp
);

CREATE TABLE "delivery_fee" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "rate_id" uuid,
  "calculated_fee" decimal,
  "calculated_at" timestamp
);

CREATE TABLE "delivery_distance_calculation" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "origin_location_id" uuid,
  "destination_location_id" uuid,
  "distance_km" decimal,
  "duration_minutes" integer,
  "calculated_at" timestamp
);

CREATE TABLE "order_otp" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "otp_code" varchar,
  "expires_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "order_otp_verification" (
  "id" uuid PRIMARY KEY,
  "order_otp_id" uuid,
  "verified_by" uuid,
  "verified_at" timestamp,
  "success" boolean
);

CREATE TABLE "order_incident" (
  "id" uuid PRIMARY KEY,
  "order_id" uuid,
  "incident_type_id" uuid,
  "reported_by" uuid,
  "description" text,
  "status" varchar,
  "created_at" timestamp
);

CREATE TABLE "order_incident_type" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "description" text
);

CREATE TABLE "support_ticket" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "order_id" uuid,
  "subject" varchar,
  "status" varchar,
  "created_at" timestamp,
  "closed_at" timestamp
);

CREATE TABLE "support_ticket_event" (
  "id" uuid PRIMARY KEY,
  "ticket_id" uuid,
  "event_type" varchar,
  "message" text,
  "created_by" uuid,
  "created_at" timestamp
);

CREATE UNIQUE INDEX ON "notification_template" ("code", "channel_id");

CREATE UNIQUE INDEX ON "notification_setting" ("user_id", "channel_id", "notification_code");

CREATE UNIQUE INDEX ON "push_device" ("device_token");

CREATE UNIQUE INDEX ON "notification_event_template" ("event_id", "template_id");

COMMENT ON COLUMN "user_profile"."commune" IS '1 to 22';

ALTER TABLE "user_profile" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "role_permission" ADD FOREIGN KEY ("role_id") REFERENCES "role" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "role_permission" ADD FOREIGN KEY ("permission_id") REFERENCES "permission" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_role" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_role" ADD FOREIGN KEY ("role_id") REFERENCES "role" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "session" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "session" ADD FOREIGN KEY ("device_id") REFERENCES "user_device" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "recovery_token" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "verification_token" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_device" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "access_audit" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "access_audit" ADD FOREIGN KEY ("device_id") REFERENCES "user_device" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("invoice_sequence_id") REFERENCES "invoice_sequence" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("invoice_type_id") REFERENCES "invoice_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice" ADD FOREIGN KEY ("created_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice_item" ADD FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice_adjustment" ADD FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice_adjustment" ADD FOREIGN KEY ("created_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice_party" ADD FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment" ADD FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment" ADD FOREIGN KEY ("payment_method_id") REFERENCES "payment_method" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment" ADD FOREIGN KEY ("created_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment_application" ADD FOREIGN KEY ("payment_id") REFERENCES "payment" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment_application" ADD FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payment_reference" ADD FOREIGN KEY ("payment_id") REFERENCES "payment" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund" ADD FOREIGN KEY ("payment_id") REFERENCES "payment" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "refund" ADD FOREIGN KEY ("created_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gateway_configuration" ADD FOREIGN KEY ("gateway_provider_id") REFERENCES "gateway_provider" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gateway_transaction" ADD FOREIGN KEY ("payment_id") REFERENCES "payment" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gateway_transaction" ADD FOREIGN KEY ("gateway_provider_id") REFERENCES "gateway_provider" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gateway_event" ADD FOREIGN KEY ("gateway_transaction_id") REFERENCES "gateway_transaction" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "financial_status_history" ADD FOREIGN KEY ("changed_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "financial_trace_log" ADD FOREIGN KEY ("created_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_contract" ADD FOREIGN KEY ("business_entity_id") REFERENCES "business_entity" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_contract" ADD FOREIGN KEY ("created_by") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_billing_period" ADD FOREIGN KEY ("business_contract_id") REFERENCES "business_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_consumption_summary" ADD FOREIGN KEY ("business_billing_period_id") REFERENCES "business_billing_period" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_invoice" ADD FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_invoice" ADD FOREIGN KEY ("business_contract_id") REFERENCES "business_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_invoice" ADD FOREIGN KEY ("business_billing_period_id") REFERENCES "business_billing_period" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_billing_support_document" ADD FOREIGN KEY ("business_invoice_id") REFERENCES "business_invoice" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "business_billing_rule" ADD FOREIGN KEY ("business_contract_id") REFERENCES "business_contract" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "financial_setting" ADD FOREIGN KEY ("business_entity_id") REFERENCES "business_entity" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "financial_setting" ADD FOREIGN KEY ("default_tax_id") REFERENCES "tax" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice_sequence" ADD FOREIGN KEY ("business_entity_id") REFERENCES "business_entity" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoice_sequence" ADD FOREIGN KEY ("invoice_type_id") REFERENCES "invoice_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_template" ADD FOREIGN KEY ("channel_id") REFERENCES "notification_channel" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_setting" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_setting" ADD FOREIGN KEY ("channel_id") REFERENCES "notification_channel" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "push_device" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_recipient" ADD FOREIGN KEY ("notification_id") REFERENCES "notification" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_recipient" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_delivery" ADD FOREIGN KEY ("notification_recipient_id") REFERENCES "notification_recipient" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_delivery" ADD FOREIGN KEY ("channel_id") REFERENCES "notification_channel" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_event_template" ADD FOREIGN KEY ("event_id") REFERENCES "notification_event" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notification_event_template" ADD FOREIGN KEY ("template_id") REFERENCES "notification_template" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location" ADD FOREIGN KEY ("category_id") REFERENCES "location_category" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "location_address" ADD FOREIGN KEY ("location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "geofence" ADD FOREIGN KEY ("group_id") REFERENCES "geofence_group" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "geofence_assignment" ADD FOREIGN KEY ("geofence_id") REFERENCES "geofence" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery" ADD FOREIGN KEY ("courier_id") REFERENCES "courier" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tracking_latest" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "tracking_history" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "spatial_rule" ADD FOREIGN KEY ("geofence_id") REFERENCES "geofence" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "spatial_event_log" ADD FOREIGN KEY ("rule_id") REFERENCES "spatial_rule" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "spatial_event_log" ADD FOREIGN KEY ("geofence_id") REFERENCES "geofence" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "spatial_event_log" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant" ADD FOREIGN KEY ("owner_id") REFERENCES "restaurant_owner" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant" ADD FOREIGN KEY ("profile_id") REFERENCES "restaurant_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant" ADD FOREIGN KEY ("status_id") REFERENCES "restaurant_status" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant" ADD FOREIGN KEY ("location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant_schedule" ADD FOREIGN KEY ("restaurant_id") REFERENCES "restaurant" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant_document" ADD FOREIGN KEY ("restaurant_id") REFERENCES "restaurant" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "customer" ADD FOREIGN KEY ("profile_id") REFERENCES "customer_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "customer_contact" ADD FOREIGN KEY ("customer_id") REFERENCES "customer" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "customer_address" ADD FOREIGN KEY ("customer_id") REFERENCES "customer" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "customer_address" ADD FOREIGN KEY ("location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "customer_note" ADD FOREIGN KEY ("customer_id") REFERENCES "customer" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier" ADD FOREIGN KEY ("profile_id") REFERENCES "courier_profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier" ADD FOREIGN KEY ("vehicle_id") REFERENCES "courier_vehicle" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier" ADD FOREIGN KEY ("availability_id") REFERENCES "courier_availability" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier_vehicle" ADD FOREIGN KEY ("courier_id") REFERENCES "courier" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier_document" ADD FOREIGN KEY ("courier_id") REFERENCES "courier" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier_zone_assignment" ADD FOREIGN KEY ("courier_id") REFERENCES "courier" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "courier_zone_assignment" ADD FOREIGN KEY ("geofence_id") REFERENCES "geofence" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order" ADD FOREIGN KEY ("restaurant_id") REFERENCES "restaurant" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order" ADD FOREIGN KEY ("customer_id") REFERENCES "customer" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order" ADD FOREIGN KEY ("status_id") REFERENCES "order_status" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order" ADD FOREIGN KEY ("priority_id") REFERENCES "order_priority" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_item" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_history" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_status_history" ADD FOREIGN KEY ("status_id") REFERENCES "order_status" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_note" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_assignment" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_assignment" ADD FOREIGN KEY ("courier_id") REFERENCES "courier" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_assignment_history" ADD FOREIGN KEY ("order_assignment_id") REFERENCES "order_assignment" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_route" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_route" ADD FOREIGN KEY ("origin_location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_route" ADD FOREIGN KEY ("destination_location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_status_history" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_status_history" ADD FOREIGN KEY ("status_id") REFERENCES "delivery_status" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_proof" ADD FOREIGN KEY ("delivery_id") REFERENCES "delivery" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_rate_rule" ADD FOREIGN KEY ("rate_id") REFERENCES "delivery_rate" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_rate_rule" ADD FOREIGN KEY ("geofence_id") REFERENCES "geofence" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_fee" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_fee" ADD FOREIGN KEY ("rate_id") REFERENCES "delivery_rate" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_distance_calculation" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_distance_calculation" ADD FOREIGN KEY ("origin_location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "delivery_distance_calculation" ADD FOREIGN KEY ("destination_location_id") REFERENCES "location" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_otp" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_otp_verification" ADD FOREIGN KEY ("order_otp_id") REFERENCES "order_otp" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_incident" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "order_incident" ADD FOREIGN KEY ("incident_type_id") REFERENCES "order_incident_type" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "support_ticket" ADD FOREIGN KEY ("order_id") REFERENCES "order" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "support_ticket_event" ADD FOREIGN KEY ("ticket_id") REFERENCES "support_ticket" ("id") DEFERRABLE INITIALLY IMMEDIATE;
