-- Store Google Calendar OAuth tokens for coordinator accounts.
ALTER TABLE "usuarios" ADD COLUMN "google_access_token" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "google_refresh_token" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "google_token_expiry" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN "google_calendar_connected" BOOLEAN NOT NULL DEFAULT false;
