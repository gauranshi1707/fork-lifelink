-- Private storage bucket for health documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false);

-- Storage policies — files live under <user_id>/<filename>
CREATE POLICY "Vault: users view own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Vault: users upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Vault: users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Vault: users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Document categories
CREATE TYPE public.vault_category AS ENUM ('prescription','lab_report','scan','insurance','other');

-- Metadata table
CREATE TABLE public.vault_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category public.vault_category NOT NULL DEFAULT 'other',
  storage_path text NOT NULL UNIQUE,
  content_type text,
  file_size bigint,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vault docs: users view own"
  ON public.vault_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Vault docs: users insert own"
  ON public.vault_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vault docs: users update own"
  ON public.vault_documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Vault docs: users delete own"
  ON public.vault_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_vault_documents_updated_at BEFORE UPDATE ON public.vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vault_docs_user ON public.vault_documents (user_id, created_at DESC);
CREATE INDEX idx_vault_docs_category ON public.vault_documents (user_id, category);