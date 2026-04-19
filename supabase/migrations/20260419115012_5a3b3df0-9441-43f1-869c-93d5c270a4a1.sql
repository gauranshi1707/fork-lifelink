-- Status enum for doses
CREATE TYPE public.dose_status AS ENUM ('pending', 'taken', 'skipped', 'missed');

-- Medications
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  notes TEXT,
  photo_url TEXT,
  times TEXT[] NOT NULL DEFAULT '{}', -- array of HH:MM strings (24h, local)
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_user ON public.medications(user_id);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own medications"
  ON public.medications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own medications"
  ON public.medications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own medications"
  ON public.medications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own medications"
  ON public.medications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Doses
CREATE TABLE public.medication_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status dose_status NOT NULL DEFAULT 'pending',
  action_at TIMESTAMPTZ,
  family_notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medication_id, scheduled_at)
);

CREATE INDEX idx_doses_user_scheduled ON public.medication_doses(user_id, scheduled_at);
CREATE INDEX idx_doses_status_scheduled ON public.medication_doses(status, scheduled_at);

ALTER TABLE public.medication_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own doses"
  ON public.medication_doses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own doses"
  ON public.medication_doses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own doses"
  ON public.medication_doses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own doses"
  ON public.medication_doses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_doses_updated_at
  BEFORE UPDATE ON public.medication_doses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: mark overdue pending doses as missed.
-- Returns rows that just transitioned so the edge function can email each one.
CREATE OR REPLACE FUNCTION public.mark_missed_doses(_grace_minutes INT DEFAULT 30)
RETURNS TABLE (
  dose_id UUID,
  user_id UUID,
  medication_id UUID,
  scheduled_at TIMESTAMPTZ,
  medication_name TEXT,
  dosage TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE public.medication_doses d
    SET status = 'missed', updated_at = now()
    WHERE d.status = 'pending'
      AND d.scheduled_at < (now() - make_interval(mins => _grace_minutes))
    RETURNING d.id, d.user_id, d.medication_id, d.scheduled_at
  )
  SELECT
    u.id AS dose_id,
    u.user_id,
    u.medication_id,
    u.scheduled_at,
    m.name AS medication_name,
    m.dosage
  FROM updated u
  JOIN public.medications m ON m.id = u.medication_id;
END;
$$;