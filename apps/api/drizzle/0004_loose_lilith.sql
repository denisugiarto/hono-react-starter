-- Ubah primary key rate_limit: key → id (diperbaiki manual, drizzle-kit
-- tidak bisa mendeteksi nama constraint PK lama secara otomatis)
ALTER TABLE "rate_limit" DROP CONSTRAINT "rate_limit_pkey";--> statement-breakpoint
ALTER TABLE "rate_limit" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limit" ADD CONSTRAINT "rate_limit_key_unique" UNIQUE("key");
