-- Link each invoice to at most one order (1:1 optional relation)
ALTER TABLE "invoice"
ADD COLUMN "order_id" UUID;

ALTER TABLE "invoice" ADD CONSTRAINT "invoice_order_id_key" UNIQUE ("order_id");

ALTER TABLE "invoice" ADD CONSTRAINT "invoice_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order" ("id") ON DELETE SET NULL ON UPDATE CASCADE;