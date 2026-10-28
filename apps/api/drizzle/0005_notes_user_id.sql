-- Notes menjadi per-user (kolom user_id NOT NULL + FK ke user).
-- Catatan: migrasi ini mengasumsikan tabel notes kosong (data demo starter).
-- Bila sudah ada data, isi dulu pemiliknya secara manual sebelum migrasi:
--   ALTER TABLE "notes" ADD COLUMN "user_id" text;
--   UPDATE "notes" SET "user_id" = '<id user>';
--   lalu jalankan migrasi dengan baris ADD COLUMN diganti SET NOT NULL.
ALTER TABLE "notes" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_user_id_idx" ON "notes" USING btree ("user_id");
