
-- Add new columns to runner_verifications
ALTER TABLE public.runner_verifications
  ADD COLUMN IF NOT EXISTS id_back_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intro_video_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT NULL;
