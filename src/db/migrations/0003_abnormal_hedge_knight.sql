CREATE TYPE "public"."price_rounding_mode" AS ENUM('up', 'nearest');--> statement-breakpoint
ALTER TABLE "price_update_batches" ADD COLUMN "rounding_mode" "price_rounding_mode";