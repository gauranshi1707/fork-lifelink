import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Loader2, Mail, Lock, UserRound, ArrowRight } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1, "Tell us your name").max(80),
});

type Mode = "signin" | "signup";

const Auth = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const initialMode: Mode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setMode(params.get("mode") === "signup" ? "signup" : "signin");
  }, [params]);

  const switchMode = (next: Mode) => {
    const newParams = new URLSearchParams(params);
    if (next === "signup") newParams.set("mode", "signup");
    else newParams.delete("mode");
    setParams(newParams, { replace: true });
  };

  const heading = mode === "signup" ? "Create your Aidly account" : "Welcome back";
  const subheading = useMemo(
    () =>
      mode === "signup"
        ? "Free forever. Unlock reminders, the donor network, and your private health vault."
        : "Sign in to access your reminders, donor profile, and health vault.",
    [mode],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ email, password, displayName });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: parsed.data.displayName },
          },
        });
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message.includes("already registered")
              ? "That email already has an account. Try signing in."
              : error.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Check your inbox",
          description: "We sent a confirmation link to verify your email.",
        });
        switchMode("signin");
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast({ title: "Check your details", description: parsed.error.issues[0].message, variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message.includes("Invalid login")
              ? "Email or password doesn't match our records."
              : error.message,
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Welcome back" });
        navigate("/", { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: String(result.error.message ?? result.error), variant: "destructive" });
        return;
      }
      if (result.redirected) return;
      navigate("/", { replace: true });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container relative grid min-h-[calc(100vh-8rem)] items-center py-10 md:grid-cols-2 md:gap-12">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden rounded-3xl bg-gradient-primary p-10 text-primary-foreground shadow-soft md:block">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <Heart className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl">Aidly</span>
          </Link>
          <div className="mt-auto space-y-6">
            <h2 className="font-display text-4xl leading-tight">
              Care that meets you where you are.
            </h2>
            <p className="max-w-sm text-base/relaxed text-primary-foreground/85">
              An account keeps your reminders, donor profile, and medical documents in one secure, private place — always accessible when you need them.
            </p>
            <ul className="space-y-3 text-sm text-primary-foreground/90">
              {[
                "Smart medicine reminders with family alerts",
                "Privacy-first blood donor matching",
                "Encrypted health document vault",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 place-items-center rounded-full bg-white/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft sm:p-9">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Heart className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl">Aidly</span>
          </div>

          <h1 className="font-display text-3xl tracking-tight">{heading}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subheading}</p>

          <div className="mt-6 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-medium">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "rounded-full px-4 py-2 transition-base",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-6 h-11 w-full rounded-full text-sm font-medium"
            onClick={handleGoogle}
            disabled={googleLoading || submitting}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    className="h-11 rounded-xl pl-10"
                    placeholder="Alex Morgan"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-11 rounded-xl pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-11 rounded-xl pl-10"
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-gradient-primary text-primary-foreground hover:opacity-95"
              disabled={submitting || googleLoading}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to use Aidly responsibly. Aidly does not replace professional medical care.
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New to Aidly?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Create one free"}
          </button>
        </p>
      </section>
    </div>
  );
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.886-1.737 2.986-4.296 2.986-7.35Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.227-2.51c-.895.6-2.04.954-3.391.954-2.605 0-4.81-1.76-5.595-4.123H3.064v2.59A9.998 9.998 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.405 13.9a6.005 6.005 0 0 1 0-3.8V7.51H3.064a10 10 0 0 0 0 8.98L6.405 13.9Z" />
    <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.866-2.866C16.96 3.022 14.696 2 12 2A9.998 9.998 0 0 0 3.064 7.51l3.341 2.59C7.19 7.737 9.395 5.977 12 5.977Z" />
  </svg>
);

export default Auth;
