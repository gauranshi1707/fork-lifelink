import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Upload,
  Loader2,
  ShieldCheck,
  Search,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Share2,
  Copy,
  Eye,
  Lock,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ACCEPTED_MIME,
  MAX_FILE_SIZE_MB,
  VAULT_CATEGORIES,
  categoryMeta,
  formatBytes,
  isImage,
  isPdf,
  safeFileName,
  shareLink,
  signedUrl,
  type VaultCategory,
} from "@/lib/vault";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VaultDoc {
  id: string;
  user_id: string;
  name: string;
  category: VaultCategory;
  storage_path: string;
  content_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

export default function Vault() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="container py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) {
    return (
      <section className="container py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-card p-10 text-center shadow-card">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
            <Lock className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold">Sign in to open your vault</h1>
          <p className="mt-3 text-muted-foreground">
            Your Health Vault is private and encrypted. Only you can see your documents.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </section>
    );
  }

  return <VaultAuthed userId={user.id} />;
}

function VaultAuthed({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VaultCategory | "all">("all");
  const [previewDoc, setPreviewDoc] = useState<VaultDoc | null>(null);
  const [shareDoc, setShareDoc] = useState<VaultDoc | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<VaultDoc | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load vault", description: error.message, variant: "destructive" });
    setDocs((data ?? []) as VaultDoc[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (filter !== "all" && d.category !== filter) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || (d.notes ?? "").toLowerCase().includes(q);
    });
  }, [docs, search, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length };
    for (const d of docs) c[d.category] = (c[d.category] ?? 0) + 1;
    return c;
  }, [docs]);

  return (
    <section className="container py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Private & encrypted at rest
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Digital Health Vault</h1>
          <p className="mt-2 text-muted-foreground">
            Store prescriptions, lab reports, scans, and insurance docs. Share with a doctor through a 24-hour link.
          </p>
        </div>
        <Button size="lg" className="rounded-full shadow-elevated" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload document
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or note…"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as VaultCategory | "all")}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories ({counts.all ?? 0})</SelectItem>
            {VAULT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.emoji} {c.label} ({counts[c.value] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState onUpload={() => setUploadOpen(true)} hasDocs={docs.length > 0} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DocCard
              key={d.id}
              doc={d}
              onPreview={() => setPreviewDoc(d)}
              onShare={() => setShareDoc(d)}
              onDelete={() => setDeleteDoc(d)}
            />
          ))}
        </div>
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} userId={userId} onUploaded={load} />
      <PreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      <ShareDialog doc={shareDoc} onClose={() => setShareDoc(null)} />
      <DeleteDialog
        doc={deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onDeleted={() => {
          setDeleteDoc(null);
          load();
        }}
      />
    </section>
  );
}

function EmptyState({ onUpload, hasDocs }: { onUpload: () => void; hasDocs: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="h-7 w-7" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">
        {hasDocs ? "Nothing matches your filter" : "Your vault is empty"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasDocs ? "Try a different category or search term." : "Upload your first prescription, lab report, or scan."}
      </p>
      {!hasDocs && (
        <Button onClick={onUpload} className="mt-5 rounded-full">
          <Upload className="h-4 w-4" />
          Upload document
        </Button>
      )}
    </div>
  );
}

function DocCard({
  doc,
  onPreview,
  onShare,
  onDelete,
}: {
  doc: VaultDoc;
  onPreview: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const meta = categoryMeta(doc.category);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (isImage(doc.content_type)) {
      signedUrl(doc.storage_path, 600)
        .then((u) => !cancelled && setThumb(u))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [doc.id, doc.content_type, doc.storage_path]);

  return (
    <Card className="overflow-hidden transition hover:shadow-elevated">
      <button
        onClick={onPreview}
        className="block aspect-[4/3] w-full overflow-hidden bg-muted/40 text-left"
        aria-label={`Preview ${doc.name}`}
      >
        {thumb ? (
          <img src={thumb} alt={doc.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            {isPdf(doc.content_type) ? (
              <FileText className="h-12 w-12" />
            ) : isImage(doc.content_type) ? (
              <ImageIcon className="h-12 w-12" />
            ) : (
              <FileText className="h-12 w-12" />
            )}
            <span className="text-2xl">{meta.emoji}</span>
          </div>
        )}
      </button>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-medium leading-snug">{doc.name}</p>
          <Badge className={meta.color + " shrink-0"}>{meta.label}</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(doc.created_at), "PP")}</span>
          <span>{formatBytes(doc.file_size)}</span>
        </div>
        {doc.notes && <p className="line-clamp-2 text-sm text-muted-foreground">{doc.notes}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" className="rounded-full" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" onClick={onShare}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto rounded-full text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadDialog({
  open,
  onClose,
  userId,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onUploaded: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<VaultCategory>("prescription");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setName("");
      setNotes("");
      setCategory("prescription");
    }
  }, [open]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max ${MAX_FILE_SIZE_MB} MB.`, variant: "destructive" });
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async () => {
    if (!file) {
      toast({ title: "Choose a file first", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Add a name", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${userId}/${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("vault").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { error: dbErr } = await supabase.from("vault_documents").insert({
      user_id: userId,
      name: name.trim().slice(0, 120),
      category,
      storage_path: path,
      content_type: file.type || null,
      file_size: file.size,
      notes: notes.trim() ? notes.trim().slice(0, 500) : null,
    });
    setUploading(false);
    if (dbErr) {
      await supabase.storage.from("vault").remove([path]);
      toast({ title: "Could not save", description: dbErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Document saved" });
    onUploaded();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload to your vault</DialogTitle>
          <DialogDescription>PDF or image, up to {MAX_FILE_SIZE_MB} MB. Files are private to you.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition hover:border-primary hover:bg-primary-soft"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            {file ? (
              <>
                <p className="mt-2 font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium">Click or drop a file here</p>
                <p className="text-xs text-muted-foreground">PDF · PNG · JPG · WebP</p>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_MIME}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Document name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blood test — Mar 2026" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as VaultCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor / clinic (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} placeholder="Notes" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button onClick={submit} disabled={uploading || !file} className="rounded-full">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Save to vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ doc, onClose }: { doc: VaultDoc | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) {
      setUrl(null);
      return;
    }
    setLoading(true);
    signedUrl(doc.storage_path, 600)
      .then(setUrl)
      .catch((e) => toast({ title: "Could not preview", description: (e as Error).message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [doc]);

  if (!doc) return null;
  const meta = categoryMeta(doc.category);

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{doc.name}</span>
            <Badge className={meta.color}>{meta.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            {format(new Date(doc.created_at), "PPp")} · {formatBytes(doc.file_size)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[420px] overflow-hidden rounded-2xl border border-border bg-muted/30">
          {loading || !url ? (
            <div className="grid h-[420px] place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isImage(doc.content_type) ? (
            <img src={url} alt={doc.name} className="mx-auto max-h-[70vh] w-full object-contain" />
          ) : isPdf(doc.content_type) ? (
            <iframe src={url} title={doc.name} className="h-[70vh] w-full" />
          ) : (
            <div className="grid h-[420px] place-items-center text-center text-muted-foreground">
              <div>
                <FileText className="mx-auto h-10 w-10" />
                <p className="mt-2 text-sm">Inline preview not available for this file type.</p>
              </div>
            </div>
          )}
        </div>

        {doc.notes && <p className="text-sm text-muted-foreground">{doc.notes}</p>}

        <DialogFooter>
          {url && (
            <Button asChild variant="outline" className="rounded-full">
              <a href={url} download={doc.name} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Download
              </a>
            </Button>
          )}
          <Button onClick={onClose} className="rounded-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ doc, onClose }: { doc: VaultDoc | null; onClose: () => void }) {
  const [hours, setHours] = useState(24);
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!doc) {
      setLink(null);
      setHours(24);
    }
  }, [doc]);

  if (!doc) return null;

  const generate = async () => {
    setGenerating(true);
    try {
      const url = await shareLink(doc.storage_path, hours);
      setLink(url);
    } catch (e) {
      toast({ title: "Could not generate link", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: `Anyone with this link can view for ${hours}h.` });
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share with a doctor
          </DialogTitle>
          <DialogDescription>
            Create a time-limited link to <strong>{doc.name}</strong>. The link expires automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link expires in</Label>
            <Select value={String(hours)} onValueChange={(v) => { setHours(Number(v)); setLink(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {link ? (
            <div className="space-y-2">
              <Label>Shareable link</Label>
              <div className="flex gap-2">
                <Input value={link} readOnly onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                <Button onClick={copy} className="rounded-full" size="icon" aria-label="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the file for {hours}h. Share it only with people you trust.
              </p>
            </div>
          ) : (
            <Button onClick={generate} disabled={generating} className="w-full rounded-full">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Generate link
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  doc,
  onClose,
  onDeleted,
}: {
  doc: VaultDoc | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  if (!doc) return null;

  const remove = async () => {
    setDeleting(true);
    const { error: stErr } = await supabase.storage.from("vault").remove([doc.storage_path]);
    if (stErr) {
      setDeleting(false);
      toast({ title: "Could not delete file", description: stErr.message, variant: "destructive" });
      return;
    }
    const { error: dbErr } = await supabase.from("vault_documents").delete().eq("id", doc.id);
    setDeleting(false);
    if (dbErr) {
      toast({ title: "File removed but record stayed", description: dbErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Document deleted" });
    onDeleted();
  };

  return (
    <AlertDialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this document?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{doc.name}</strong> will be permanently removed from your vault. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
