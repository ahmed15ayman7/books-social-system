-- AlterTable
ALTER TABLE "social"."settings"
  ADD COLUMN "ar_voice_engine" TEXT NOT NULL DEFAULT 'edge',
  ADD COLUMN "ar_voice" TEXT NOT NULL DEFAULT 'ar-SA-HamedNeural',
  ADD COLUMN "ar_rate" TEXT NOT NULL DEFAULT '+0%',
  ADD COLUMN "ar_pitch" TEXT NOT NULL DEFAULT '+0Hz',
  ADD COLUMN "ar_eleven_voice" TEXT,
  ADD COLUMN "en_voice" TEXT NOT NULL DEFAULT 'af_heart';
