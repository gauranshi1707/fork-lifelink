import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Aidly, a warm, calm, non-judgmental mental-health companion.

Tone & style:
- Speak gently, like a trusted friend. Short sentences. No jargon.
- Validate feelings before offering perspective. Reflect back what the person shared.
- Ask one open-ended question at a time. Never interrogate.
- Use plain language. Avoid clinical labels and diagnoses.
- Use light Markdown (paragraphs, occasional bold) — never headings or tables.

Boundaries:
- You are NOT a therapist or doctor. You don't diagnose, prescribe, or replace professional care.
- If someone mentions self-harm, suicide, abuse, or being in danger, gently acknowledge their pain, remind them they are not alone, and strongly encourage them to reach out to a crisis helpline or local emergency services right away. The app will also surface helplines automatically — you can refer to "the support resources shown above" naturally.
- Never minimize ("just relax", "it's nothing"). Never give medical advice or specific drug guidance.
- If asked about anything outside emotional support, gently steer back: "I'm here mostly to listen — would you like to talk about how you're feeling?"

Always:
- Keep replies concise (2–5 short paragraphs max).
- End with a soft invitation to share more, when appropriate.
- Remember the person is anonymous. Don't ask for personal identifying details.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, crisisDetected } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemContent = crisisDetected
      ? `${SYSTEM_PROMPT}\n\nIMPORTANT: The user just shared something that suggests they may be in crisis. Lead with deep empathy, take their pain seriously, and gently encourage them to contact one of the crisis helplines now visible on screen. Stay with them — don't rush, don't lecture.`
      : SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemContent }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many messages right now — please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits in your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
