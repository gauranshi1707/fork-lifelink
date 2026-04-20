-- Enums
CREATE TYPE public.blood_group AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');
CREATE TYPE public.urgency_level AS ENUM ('low','normal','high','critical');
CREATE TYPE public.request_status AS ENUM ('open','fulfilled','cancelled');
CREATE TYPE public.contact_request_status AS ENUM ('pending','accepted','declined','cancelled');

-- DONORS
CREATE TABLE public.donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  blood_group public.blood_group NOT NULL,
  city text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  last_donation_date date,
  visible boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view visible donors"
  ON public.donors FOR SELECT TO authenticated
  USING (visible = true OR auth.uid() = user_id);

CREATE POLICY "Users insert own donor profile"
  ON public.donors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own donor profile"
  ON public.donors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own donor profile"
  ON public.donors FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_donors_updated_at BEFORE UPDATE ON public.donors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BLOOD REQUESTS
CREATE TABLE public.blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  blood_group public.blood_group NOT NULL,
  units integer NOT NULL DEFAULT 1 CHECK (units > 0),
  hospital text NOT NULL,
  city text NOT NULL,
  latitude double precision,
  longitude double precision,
  urgency public.urgency_level NOT NULL DEFAULT 'normal',
  contact_preference text NOT NULL DEFAULT 'in_app',
  status public.request_status NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view requests"
  ON public.blood_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users insert own requests"
  ON public.blood_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users update own requests"
  ON public.blood_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Users delete own requests"
  ON public.blood_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);

CREATE TRIGGER set_blood_requests_updated_at BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DONOR CONTACT REQUESTS (privacy-first consent flow)
CREATE TABLE public.donor_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_user_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  status public.contact_request_status NOT NULL DEFAULT 'pending',
  message text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, donor_user_id)
);

ALTER TABLE public.donor_contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester or donor can view contact requests"
  ON public.donor_contact_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = donor_user_id);

CREATE POLICY "Requester creates contact requests"
  ON public.donor_contact_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Donor or requester updates contact request"
  ON public.donor_contact_requests FOR UPDATE TO authenticated
  USING (auth.uid() = donor_user_id OR auth.uid() = requester_id);

CREATE TRIGGER set_donor_contact_requests_updated_at BEFORE UPDATE ON public.donor_contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_donors_blood_visible ON public.donors (blood_group, visible);
CREATE INDEX idx_blood_requests_status ON public.blood_requests (status, blood_group);
CREATE INDEX idx_contact_requests_donor ON public.donor_contact_requests (donor_user_id, status);
CREATE INDEX idx_contact_requests_requester ON public.donor_contact_requests (requester_id, status);

-- Haversine search for matching donors
CREATE OR REPLACE FUNCTION public.donors_within_radius(
  _blood_group public.blood_group,
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 25
)
RETURNS TABLE (
  donor_id uuid,
  user_id uuid,
  blood_group public.blood_group,
  city text,
  latitude double precision,
  longitude double precision,
  last_donation_date date,
  note text,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    d.id AS donor_id,
    d.user_id,
    d.blood_group,
    d.city,
    d.latitude,
    d.longitude,
    d.last_donation_date,
    d.note,
    (6371 * acos(
      cos(radians(_lat)) * cos(radians(d.latitude))
      * cos(radians(d.longitude) - radians(_lng))
      + sin(radians(_lat)) * sin(radians(d.latitude))
    )) AS distance_km
  FROM public.donors d
  WHERE d.visible = true
    AND d.blood_group = _blood_group
    AND (d.last_donation_date IS NULL OR d.last_donation_date <= (CURRENT_DATE - INTERVAL '90 days'))
    AND (6371 * acos(
      cos(radians(_lat)) * cos(radians(d.latitude))
      * cos(radians(d.longitude) - radians(_lng))
      + sin(radians(_lat)) * sin(radians(d.latitude))
    )) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT 100;
$$;