-- AlterEnum
ALTER TYPE "social"."JobKind" ADD VALUE 'REVISE';

-- CreateEnum
CREATE TYPE "social"."MessageRole" AS ENUM ('USER', 'CLAUDE');

-- AlterTable
ALTER TABLE "social"."agent_jobs" ADD COLUMN "target" TEXT, ADD COLUMN "instruction" TEXT;
ALTER TABLE "social"."content_books" ADD COLUMN "files" JSONB, ADD COLUMN "files_synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "social"."book_messages" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "role" "social"."MessageRole" NOT NULL,
    "body" TEXT NOT NULL,
    "target" TEXT,
    "job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "book_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "book_messages_book_id_created_at_idx" ON "social"."book_messages"("book_id", "created_at");
ALTER TABLE "social"."book_messages" ADD CONSTRAINT "book_messages_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "social"."content_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
