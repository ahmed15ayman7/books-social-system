ALTER TABLE "social"."book_stats" ADD COLUMN "author_name" TEXT,
  ADD COLUMN "author_readers" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "author_works" INTEGER NOT NULL DEFAULT 0;

-- re-fetch everything with the new signal
UPDATE "social"."book_stats" SET "fetched_at" = NULL;
