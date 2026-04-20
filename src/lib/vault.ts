import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type VaultCategory = Database["public"]["Enums"]["vault_category"];

export const VAULT_CATEGORIES: { value: VaultCategory; label: string; emoji: string; color: string }[] = [
  { value: "prescription", label: "Prescription", emoji: "💊", color: "bg-primary-soft text-primary" },
  { value: "lab_report", label: "Lab Report", emoji: "🧪", color: "bg-accent-soft text-accent" },
  { value: "scan", label: "Scan / Imaging", emoji: "🩻", color: "bg-secondary text-secondary-foreground" },
  { value: "insurance", label: "Insurance", emoji: "🛡️", color: "bg-success/15 text-success" },
  { value: "other", label: "Other", emoji: "📄", color: "bg-muted text-muted-foreground" },
];

export const MAX_FILE_SIZE_MB = 25;
export const ACCEPTED_MIME =
  "application/pdf,image/png,image/jpeg,image/webp,image/heic";

export function categoryMeta(value: VaultCategory) {
  return VAULT_CATEGORIES.find((c) => c.value === value) ?? VAULT_CATEGORIES[VAULT_CATEGORIES.length - 1];
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImage(contentType: string | null | undefined): boolean {
  return !!contentType && contentType.startsWith("image/");
}
export function isPdf(contentType: string | null | undefined): boolean {
  return contentType === "application/pdf";
}

/** Slugify the original filename for safe storage path use */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 60);
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  return `${Date.now()}-${base || "file"}${ext}`;
}

/** Get a short-lived signed URL for inline preview / downloads */
export async function signedUrl(storagePath: string, seconds = 60): Promise<string> {
  const { data, error } = await supabase.storage.from("vault").createSignedUrl(storagePath, seconds);
  if (error) throw error;
  return data.signedUrl;
}

/** Get a longer-lived sharing link (for doctor sharing) */
export async function shareLink(storagePath: string, hours = 24): Promise<string> {
  const { data, error } = await supabase.storage
    .from("vault")
    .createSignedUrl(storagePath, hours * 3600, { download: false });
  if (error) throw error;
  return data.signedUrl;
}
