-- User Points System for Referral Rewards

-- 1. Create user_points table
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  referral_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_points_balance ON public.user_points(balance DESC);
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for user_points
CREATE POLICY "Users can view their own points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users cannot modify their points directly (only via functions)"
  ON public.user_points FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Users cannot insert points directly (only via functions)"
  ON public.user_points FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 3. Create updated_at trigger for user_points
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Auto-create user_points entry when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_points (user_id, balance, points_earned, points_redeemed, referral_count)
  VALUES (NEW.user_id, 0, 0, 0, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_user_points_on_profile_create
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_points();

-- 5. Function to award points to referrer
CREATE OR REPLACE FUNCTION public.award_referrer_points(_referrer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _points_awarded integer := 10;
BEGIN
  IF _referrer_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_points
  SET 
    balance = balance + _points_awarded,
    points_earned = points_earned + _points_awarded,
    referral_count = referral_count + 1,
    updated_at = now()
  WHERE user_id = _referrer_id;

  RETURN FOUND;
END;
$$;

-- 6. Function to award points to referred user
CREATE OR REPLACE FUNCTION public.award_referred_user_points(_referred_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _points_awarded integer := 5;
BEGIN
  IF _referred_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_points
  SET 
    balance = balance + _points_awarded,
    points_earned = points_earned + _points_awarded,
    updated_at = now()
  WHERE user_id = _referred_user_id;

  RETURN FOUND;
END;
$$;

-- 7. Function to track referral with points
CREATE OR REPLACE FUNCTION public.track_referral_with_points(_referrer_code text, _referred_user_id uuid)
RETURNS TABLE(referral_id uuid, referrer_id uuid, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _referral_id uuid;
  _referrer_awarded boolean;
  _referred_awarded boolean;
BEGIN
  -- Find referrer by code
  SELECT user_id INTO _referrer_id
  FROM public.profiles
  WHERE upper(referral_code) = upper(_referrer_code)
  LIMIT 1;

  IF _referrer_id IS NULL OR _referrer_id = _referred_user_id THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false;
    RETURN;
  END IF;

  -- Check if referred user already has a referral
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = _referred_user_id) THEN
    RETURN QUERY SELECT NULL::uuid, _referrer_id, false;
    RETURN;
  END IF;

  -- Insert referral
  INSERT INTO public.referrals (referrer_id, referred_user_id, status)
  VALUES (_referrer_id, _referred_user_id, 'completed')
  RETURNING id INTO _referral_id;

  -- Award points to both users
  _referrer_awarded := public.award_referrer_points(_referrer_id);
  _referred_awarded := public.award_referred_user_points(_referred_user_id);

  RETURN QUERY SELECT _referral_id, _referrer_id, (_referrer_awarded AND _referred_awarded);
END;
$$;

-- 8. Function to get user referral stats
CREATE OR REPLACE FUNCTION public.get_user_referral_stats(_user_id uuid)
RETURNS TABLE(
  total_referrals integer,
  points_balance integer,
  points_earned integer,
  referral_code text,
  referred_user_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(up.referral_count, 0)::integer,
    COALESCE(up.balance, 0)::integer,
    COALESCE(up.points_earned, 0)::integer,
    p.referral_code,
    COUNT(r.id)::integer
  FROM public.profiles p
  LEFT JOIN public.user_points up ON p.user_id = up.user_id
  LEFT JOIN public.referrals r ON p.user_id = r.referrer_id AND r.status = 'completed'
  WHERE p.user_id = _user_id
  GROUP BY p.user_id, up.referral_count, up.balance, up.points_earned, p.referral_code;
$$;
