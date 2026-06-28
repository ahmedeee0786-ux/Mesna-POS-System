-- AlterTable: Add missing customer & payment columns to Order
ALTER TABLE "Order" ADD COLUMN "customer_name"    TEXT;
ALTER TABLE "Order" ADD COLUMN "customer_phone"   TEXT;
ALTER TABLE "Order" ADD COLUMN "customer_address" TEXT;
ALTER TABLE "Order" ADD COLUMN "cash_tendered"    REAL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "change_due"       REAL DEFAULT 0;
