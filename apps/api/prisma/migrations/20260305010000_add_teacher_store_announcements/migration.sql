-- Add TEACHER to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'TEACHER';

-- CreateEnum ProductType
CREATE TYPE "ProductType" AS ENUM ('MEMBERSHIP', 'SIGNAL_PACK', 'AUTO_TRADING', 'PRIVATE_CLASS', 'OTHER');

-- CreateEnum AnnouncementType
CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'WARNING', 'PROMO', 'MAINTENANCE', 'TRADING');

-- CreateTable products
CREATE TABLE "products" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "type"        "ProductType" NOT NULL,
  "price"       DECIMAL(10,2) NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'USD',
  "min_level"   "MembershipLevel" NOT NULL DEFAULT 'GENERAL',
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "image_url"   TEXT,
  "metadata"    JSONB,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "products_type_is_active_idx" ON "products"("type", "is_active");

-- CreateTable announcements
CREATE TABLE "announcements" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "content"       TEXT NOT NULL,
  "type"          "AnnouncementType" NOT NULL DEFAULT 'INFO',
  "min_level"     "MembershipLevel" NOT NULL DEFAULT 'GENERAL',
  "is_pinned"     BOOLEAN NOT NULL DEFAULT false,
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "expires_at"    TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "announcements_is_active_created_at_idx" ON "announcements"("is_active", "created_at" DESC);
CREATE INDEX "announcements_min_level_idx" ON "announcements"("min_level");
