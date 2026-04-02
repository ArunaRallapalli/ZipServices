-- Migration: Add message notification tracking columns to users table
-- Date: 2026-04-02
--
-- last_seen_at    — updated whenever a user opens a chat or marks messages as read.
--                  Used to detect active users (skip email if active within 10 min).
-- last_email_sent_at — updated whenever a notification email is sent to a user.
--                  Used to enforce the 1-hour cooldown between batched emails.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITHOUT TIME ZONE;
