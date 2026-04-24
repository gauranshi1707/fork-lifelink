import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, RotateCcw, AlertTriangle, Stethoscope, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CrisisSupportPanel } from "@/components/chat/CrisisSupportPanel";
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { detectCrisis } from "@/lib/crisisDetection";

const STORAGE_KEY = "lifelink:chat:v1";
const CRISIS_KEY = "lifelink:chat:crisis:v1";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mental-health-chat`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STARTER_PROMPTS = [
  "I have a headache that won't go away.",
  "I've been feeling nauseous and dizzy.",
  "My throat is sore and I have a fever.",
  "I have stomach pain after eating.",
];

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [crisisVisible, setCrisisVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CRISIS_KEY) === "1";
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore quota */
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(CRISIS_KEY, crisisVisible ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [crisisVisible]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  const hasConversation = messages.length > 0;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const isCrisis = detectCrisis(trimmed);
      if (isCrisis) setCrisisVisible(true);

      const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
      const assistantId = newId();

      // Snapshot the history to send to the API (full conversation context)
      const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: apiMessages, crisisDetected: isCrisis }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          let msg = "Something went wrong. Please try again.";
          try {
            const data = await resp.json();
            if (data?.error) msg = data.error;
          } catch {
            /* ignore */
          }
          if (resp.status === 429) msg = "You're sending messages quickly — please wait a moment.";
          if (resp.status === 402) msg = "AI usage limit reached. Please try again later.";
          throw new Error(msg);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assistantText = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line || line.startsWith(":")) continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                assistantText += delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
                );
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush leftover
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                assistantText += delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
                );
              }
            } catch {
              /* ignore */
            }
          }
        }

        if (!assistantText) {
          // Replace empty bubble with a soft fallback so UI never looks broken
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "I'm here. Could you tell me a little more about what's on your mind?" }
                : m,
            ),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        if ((err as Error)?.name !== "AbortError") {
          toast.error(msg);
        }
        // Remove the empty assistant placeholder
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && m.content === "")));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setCrisisVisible(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CRISIS_KEY);
    } catch {
      /* ignore */
    }
    toast.success("Conversation cleared. Your messages were never stored on our servers.");
  };

  const lastMessageStreaming = useMemo(() => {
    if (!isStreaming || messages.length === 0) return false;
    return messages[messages.length - 1].role === "assistant";
  }, [isStreaming, messages]);

  return (
    <section className="container max-w-4xl py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered · Anonymous
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Symptom Checker
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Describe your symptoms and get guidance on possible conditions, severity levels, and recommended next steps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setCrisisVisible((v) => !v)}
            aria-pressed={crisisVisible}
          >
            <AlertTriangle className="h-4 w-4" />
            {crisisVisible ? "Hide" : "Show"} emergency info
          </Button>
          {hasConversation && (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={clearConversation}>
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Crisis panel */}
      <div className="mt-6">
        <CrisisSupportPanel visible={crisisVisible} onDismiss={() => setCrisisVisible(false)} />
      </div>

      {/* Privacy note */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p>
          This is <strong>not a medical diagnosis</strong>. The symptom checker provides general guidance only.
          Always consult a qualified healthcare professional. In an emergency, call your local emergency number immediately.
        </p>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="mt-5 max-h-[60vh] min-h-[320px] space-y-4 overflow-y-auto rounded-3xl border border-border/60 bg-gradient-hero p-4 sm:p-6"
        aria-live="polite"
      >
        {!hasConversation ? (
          <EmptyState onPick={(t) => send(t)} disabled={isStreaming} />
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isStreaming={lastMessageStreaming && i === messages.length - 1}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="mt-4 rounded-3xl border border-border/60 bg-card p-2 shadow-card">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe your symptoms…"
            rows={1}
            disabled={isStreaming}
            className="min-h-[44px] max-h-[180px] resize-none border-0 bg-transparent text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const EmptyState = ({ onPick, disabled }: { onPick: (t: string) => void; disabled: boolean }) => (
  <div className="flex h-full flex-col items-center justify-center py-10 text-center">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
      <Stethoscope className="h-7 w-7" strokeWidth={2.25} />
    </span>
    <h2 className="mt-4 font-display text-xl font-semibold">Symptom Checker</h2>
    <p className="mt-1 max-w-md text-sm text-muted-foreground">
      Describe your symptoms to get possible conditions, severity assessment, and recommended actions.
    </p>

    <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
      {STARTER_PROMPTS.map((p) => (
        <button
          key={p}
          disabled={disabled}
          onClick={() => onPick(p)}
          className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-left text-sm text-foreground/90 shadow-soft transition-base hover:border-primary/40 hover:bg-primary-soft hover:text-primary disabled:opacity-50"
        >
          {p}
        </button>
      ))}
    </div>
  </div>
);

export default Chat;
