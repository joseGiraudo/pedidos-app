CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."line_status" AS ENUM('ok', 'out_of_stock', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."order_actor" AS ENUM('customer', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('created', 'sent', 'edited', 'changes_requested', 'item_replaced', 'accepted', 'weighed', 'delivered', 'payment_updated', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_mode" AS ENUM('unit', 'piece', 'kg');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'sent', 'changes_requested', 'accepted', 'delivered', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."price_batch_kind" AS ENUM('increase', 'import');--> statement-breakpoint
CREATE TYPE "public"."price_list" AS ENUM('wholesale', 'retail');--> statement-breakpoint
CREATE TYPE "public"."price_target" AS ENUM('wholesale', 'retail', 'both');--> statement-breakpoint
CREATE TYPE "public"."pricing_unit" AS ENUM('unit', 'kg');--> statement-breakpoint
CREATE TYPE "public"."supplier_plan" AS ENUM('free');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_supplier_id_name_unique" UNIQUE("supplier_id","name")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_supplier_id_name_unique" UNIQUE("supplier_id","name")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"address" text,
	"notes" text,
	"price_list" "price_list" DEFAULT 'wholesale' NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"access_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"whatsapp_phone" text NOT NULL,
	"logo_url" text,
	"plan" "supplier_plan" DEFAULT 'free' NOT NULL,
	"use_brands" boolean DEFAULT true NOT NULL,
	"use_categories" boolean DEFAULT true NOT NULL,
	"uses_own_codes" boolean DEFAULT false NOT NULL,
	"next_product_code" integer DEFAULT 1 NOT NULL,
	"next_order_number" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"code" text NOT NULL,
	"code_is_generated" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"brand_id" uuid,
	"category_id" uuid,
	"presentation" text,
	"units_per_pack" integer,
	"pricing_unit" "pricing_unit" DEFAULT 'unit' NOT NULL,
	"order_mode" "order_mode" DEFAULT 'unit' NOT NULL,
	"avg_piece_weight_kg" numeric(8, 3),
	"wholesale_price" numeric(12, 2) NOT NULL,
	"retail_price" numeric(12, 2),
	"is_available" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_supplier_id_code_unique" UNIQUE("supplier_id","code")
);
--> statement-breakpoint
CREATE TABLE "price_update_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"kind" "price_batch_kind" NOT NULL,
	"description" text NOT NULL,
	"percentage" numeric(6, 2),
	"rounding" integer,
	"target" "price_target" NOT NULL,
	"affected_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"reverted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"old_wholesale" numeric(12, 2),
	"new_wholesale" numeric(12, 2),
	"old_retail" numeric(12, 2),
	"new_retail" numeric(12, 2),
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"created_by" "order_actor" NOT NULL,
	"price_list" "price_list" NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"extra_discount_pct" numeric(5, 2),
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"estimated_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"final_total" numeric(12, 2),
	"customer_notes" text,
	"supplier_notes" text,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"expected_delivery_date" date,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"cancellation_reason" text,
	"cancelled_by" "order_actor",
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_supplier_id_number_unique" UNIQUE("supplier_id","number")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"presentation" text,
	"brand_name" text,
	"category_name" text,
	"pricing_unit" "pricing_unit" NOT NULL,
	"order_mode" "order_mode" NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"original_quantity" numeric(10, 3) NOT NULL,
	"line_status" "line_status" DEFAULT 'ok' NOT NULL,
	"replaces_product_id" uuid,
	"estimated_weight_kg" numeric(10, 3),
	"actual_weight_kg" numeric(10, 3),
	"estimated_line_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"final_line_total" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"event_type" "order_event_type" NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status",
	"actor" "order_actor" NOT NULL,
	"actor_user_id" text,
	"note" text,
	"changes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_batches" ADD CONSTRAINT "price_update_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_batch_id_price_update_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."price_update_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_replaces_product_id_products_id_fk" FOREIGN KEY ("replaces_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brands_supplier_id_idx" ON "brands" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "categories_supplier_id_idx" ON "categories" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "customers_supplier_id_idx" ON "customers" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "products_supplier_id_idx" ON "products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "price_update_batches_supplier_id_idx" ON "price_update_batches" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "price_changes_product_id_idx" ON "price_changes" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_changes_batch_id_idx" ON "price_changes" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "orders_supplier_id_idx" ON "orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_supplier_id_status_idx" ON "orders" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_events_order_id_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_events_supplier_id_idx" ON "order_events" USING btree ("supplier_id");