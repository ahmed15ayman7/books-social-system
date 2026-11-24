
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "social";

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('QUEUED', 'PRODUCING', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'X');

-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('SHORT_AR', 'SHORT_EN', 'REEL_AR', 'FB_BOOK', 'FB_QUESTION', 'TWEET_1', 'TWEET_2');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('PRODUCE', 'PUBLISH');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "books_per_day" INTEGER NOT NULL DEFAULT 1,
    "slot_times" JSONB NOT NULL DEFAULT '{"FB_BOOK":"10:00","TWEET_1":"11:00","SHORT_AR":"13:00","FB_QUESTION":"16:00","REEL_AR":"19:00","TWEET_2":"20:00","SHORT_EN":"23:00"}',
    "popularity_weight" INTEGER NOT NULL DEFAULT 60,
    "min_year" INTEGER NOT NULL DEFAULT 2018,
    "content_root" TEXT NOT NULL DEFAULT 'D:\booksplatformContent',
    "site_base_url" TEXT NOT NULL DEFAULT 'https://booksplatform.net',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_stats" (
    "product_id" TEXT NOT NULL,
    "isbn" TEXT,
    "matched_by" TEXT,
    "ol_ratings" INTEGER NOT NULL DEFAULT 0,
    "ol_rating_avg" DOUBLE PRECISION,
    "ol_want_to_read" INTEGER NOT NULL DEFAULT 0,
    "ol_reading" INTEGER NOT NULL DEFAULT 0,
    "ol_already_read" INTEGER NOT NULL DEFAULT 0,
    "ol_editions" INTEGER NOT NULL DEFAULT 0,
    "gb_ratings" INTEGER NOT NULL DEFAULT 0,
    "gb_rating_avg" DOUBLE PRECISION,
    "popularity_raw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fetched_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "book_stats_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "content_books" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "cover_url" TEXT,
    "year" INTEGER,
    "folder" TEXT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'QUEUED',
    "publish_date" DATE NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL,
    "platform" "Platform" NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'ar',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "text" TEXT,
    "asset_path" TEXT,
    "link" TEXT,
    "url" TEXT,
    "published_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_jobs" (
    "id" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "book_id" TEXT,
    "day" DATE,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "log" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "agent_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "book_stats_fetched_at_idx" ON "book_stats"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_books_product_id_key" ON "content_books"("product_id");

-- CreateIndex
CREATE INDEX "content_books_publish_date_idx" ON "content_books"("publish_date");

-- CreateIndex
CREATE INDEX "content_books_status_idx" ON "content_books"("status");

-- CreateIndex
CREATE INDEX "posts_scheduled_at_idx" ON "posts"("scheduled_at");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "posts_book_id_kind_key" ON "posts"("book_id", "kind");

-- CreateIndex
CREATE INDEX "agent_jobs_status_created_at_idx" ON "agent_jobs"("status", "created_at");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "content_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

