
-- Add username to runner_verifications
ALTER TABLE public.runner_verifications ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS runner_verifications_username_unique ON public.runner_verifications (username) WHERE username IS NOT NULL;

-- Add preferred_runner_id to errands
ALTER TABLE public.errands ADD COLUMN IF NOT EXISTS preferred_runner_id uuid;

-- Create preferred_runners table
CREATE TABLE IF NOT EXISTS public.preferred_runners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  runner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, runner_id)
);
ALTER TABLE public.preferred_runners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferred runners" ON public.preferred_runners
  FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Users can insert own preferred runners" ON public.preferred_runners
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can delete own preferred runners" ON public.preferred_runners
  FOR DELETE TO authenticated USING (auth.uid() = client_id);

-- Create runner_ratings table
CREATE TABLE IF NOT EXISTS public.runner_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  errand_id uuid NOT NULL REFERENCES public.errands(id),
  client_id uuid NOT NULL,
  runner_id uuid NOT NULL,
  rating integer NOT NULL,
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(errand_id, client_id)
);
ALTER TABLE public.runner_ratings ENABLE ROW LEVEL SECURITY;

-- Validation trigger for ratings (1-5, must be completed errand)
CREATE OR REPLACE FUNCTION public.validate_runner_rating()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.errands
    WHERE id = NEW.errand_id AND customer_id = NEW.client_id AND runner_id = NEW.runner_id AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Can only rate a runner on a completed errand you own';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_runner_rating
  BEFORE INSERT ON public.runner_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_runner_rating();

CREATE POLICY "Users can insert own ratings" ON public.runner_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Anyone can view ratings" ON public.runner_ratings
  FOR SELECT TO authenticated USING (true);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own conversations" ON public.conversations
  FOR SELECT TO authenticated USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Authenticated can insert conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Participants can update own conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  image_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = _conversation_id AND (participant_1 = _user_id OR participant_2 = _user_id)
  )
$$;

CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_conversation_participant(auth.uid(), conversation_id));
CREATE POLICY "Participants can insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND public.is_conversation_participant(auth.uid(), conversation_id)
  );
CREATE POLICY "Sender can update own messages" ON public.messages
  FOR UPDATE TO authenticated USING (
    public.is_conversation_participant(auth.uid(), conversation_id)
  );

-- Function to get or create a conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_user_1 uuid, p_user_2 uuid)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_id uuid;
  v_a uuid := LEAST(p_user_1, p_user_2);
  v_b uuid := GREATEST(p_user_1, p_user_2);
BEGIN
  SELECT id INTO v_id FROM public.conversations
    WHERE (participant_1 = v_a AND participant_2 = v_b);
  IF FOUND THEN RETURN v_id; END IF;
  INSERT INTO public.conversations (participant_1, participant_2)
    VALUES (v_a, v_b) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Function to get runner public profile
CREATE OR REPLACE FUNCTION public.get_runner_profile(p_runner_id uuid)
  RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_profile RECORD;
  v_verification RECORD;
  v_avg_rating numeric;
  v_total_ratings integer;
  v_completed_errands integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_runner_id;
  SELECT * INTO v_verification FROM public.runner_verifications WHERE user_id = p_runner_id AND status = 'verified';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Runner not found or not verified');
  END IF;
  SELECT COALESCE(AVG(rating), 0), COUNT(*) INTO v_avg_rating, v_total_ratings FROM public.runner_ratings WHERE runner_id = p_runner_id;
  SELECT COUNT(*) INTO v_completed_errands FROM public.errands WHERE runner_id = p_runner_id AND status = 'completed';
  RETURN jsonb_build_object(
    'user_id', p_runner_id,
    'full_name', v_profile.full_name,
    'avatar_url', v_profile.avatar_url,
    'username', v_verification.username,
    'bio', v_verification.bio,
    'town', v_verification.town,
    'transport', v_verification.transport,
    'availability', v_verification.availability,
    'avg_rating', ROUND(v_avg_rating, 1),
    'total_ratings', v_total_ratings,
    'completed_errands', v_completed_errands,
    'verified', true,
    'joined_at', v_profile.created_at
  );
END;
$$;

-- Function to search runners by username
CREATE OR REPLACE FUNCTION public.search_runners(p_query text)
  RETURNS TABLE(user_id uuid, full_name text, username text, avatar_url text, bio text, town text, avg_rating numeric, total_ratings bigint, completed_errands bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT rv.user_id, p.full_name, rv.username, p.avatar_url, rv.bio, rv.town,
    COALESCE(ROUND(AVG(rr.rating), 1), 0) AS avg_rating,
    COUNT(DISTINCT rr.id) AS total_ratings,
    (SELECT COUNT(*) FROM public.errands e WHERE e.runner_id = rv.user_id AND e.status = 'completed') AS completed_errands
  FROM public.runner_verifications rv
  JOIN public.profiles p ON p.user_id = rv.user_id
  LEFT JOIN public.runner_ratings rr ON rr.runner_id = rv.user_id
  WHERE rv.status = 'verified' AND rv.username IS NOT NULL
    AND (rv.username ILIKE '%' || p_query || '%' OR p.full_name ILIKE '%' || p_query || '%')
  GROUP BY rv.user_id, p.full_name, rv.username, p.avatar_url, rv.bio, rv.town
  LIMIT 20
$$;

-- Enable realtime for messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
