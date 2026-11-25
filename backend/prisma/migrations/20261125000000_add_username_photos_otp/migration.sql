-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- AlterTable meeting_rooms
ALTER TABLE "meeting_rooms" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable password_reset_otps
CREATE TABLE IF NOT EXISTS "password_reset_otps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_otps_user_id_fkey') THEN
        ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "password_reset_otps_user_id_otp_code_idx" ON "password_reset_otps"("user_id", "otp_code");
CREATE INDEX IF NOT EXISTS "password_reset_otps_expires_at_idx" ON "password_reset_otps"("expires_at");
