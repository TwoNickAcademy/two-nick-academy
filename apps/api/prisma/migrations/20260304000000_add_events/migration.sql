-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WEBINAR', 'LIVE_SESSION', 'WORKSHOP', 'MENTORSHIP', 'QA_SESSION');

-- CreateTable
CREATE TABLE "events" (
    "id"            TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "description"   TEXT,
    "type"          "EventType" NOT NULL DEFAULT 'WEBINAR',
    "host"          TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "stream_url"    TEXT,
    "starts_at"     TIMESTAMP(3) NOT NULL,
    "ends_at"       TIMESTAMP(3),
    "min_level"     "MembershipLevel" NOT NULL DEFAULT 'GENERAL',
    "max_attendees" INTEGER,
    "is_published"  BOOLEAN NOT NULL DEFAULT false,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id"            TEXT NOT NULL,
    "event_id"      TEXT NOT NULL,
    "user_id"       TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE INDEX "events_min_level_idx" ON "events"("min_level");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_key" ON "event_attendees"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "event_attendees_user_id_idx" ON "event_attendees"("user_id");

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
