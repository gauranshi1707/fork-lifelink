import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI-powered medical symptom checker.

Your role is to analyze user-reported symptoms and provide structured, cautious, and helpful guidance.

STRICT RULES:
- Do NOT provide a definitive diagnosis
- Do NOT claim certainty
- Always provide 2–4 possible conditions based on symptoms
- Prioritize common conditions first, then serious ones if relevant
- Clearly classify urgency level: Mild / Moderate / Urgent
- If symptoms suggest a life-threatening condition (e.g., chest pain, breathing difficulty, unconsciousness), immediately advise emergency care

REASONING:
- Consider symptom combinations, duration, severity, and progression
- If missing key info, ask follow-up questions

OUTPUT FORMAT (STRICT):

**Possible Conditions:**
- Condition 1 (short explanation)
- Condition 2 (short explanation)

**Severity:** [Mild / Moderate / Urgent]

**Recommended Action:**
1. Step 1
2. Step 2
3. Step 3

**Follow-up Questions:**
- Question 1
- Question 2

**Disclaimer:**
This is not a medical diagnosis. Please consult a qualified healthcare professional.

STYLE:
- Clear, simple language
- No jargon unless explained
- Calm and reassuring tone`;

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
      ? `${SYSTEM_PROMPT}\n\nIMPORTANT: The user has reported symptoms that may indicate a medical emergency. Prioritize advising them to seek immediate emergency care. Be direct but calm about the urgency.`
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
