
-- Unique username constraint (allow nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_runner_verifications_username 
ON public.runner_verifications (username) WHERE username IS NOT NULL;

-- Unique rating per errand per client
ALTER TABLE public.runner_ratings 
ADD CONSTRAINT runner_ratings_errand_client_unique UNIQUE (errand_id, client_id);
