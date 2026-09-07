// ═══════════════════════════════════════════════════════════════════════
// Supabase Edge Function: Anthropic-Proxy mit Key pro Firma
// ═══════════════════════════════════════════════════════════════════════
//
// Jede Firma hinterlegt ihren EIGENEN Anthropic-API-Key in den
// Firmen-Einstellungen (Unternehmen bearbeiten). Der Key landet nie im
// Frontend-Code oder im Browser des Nutzers — diese Function liest ihn
// serverseitig über den Service-Role-Client (bypasst RLS bewusst, damit
// der aufrufende Nutzer selbst den Key nicht per API auslesen kann) und
// ruft Anthropic damit auf. Ohne diesen Umweg müsste ein einzelner,
// gemeinsamer Key für ALLE Kunden im Code/als globales Secret liegen —
// bei einem Produkt, das an mehrere Unternehmen verkauft wird, trägt
// dann jede Firma ihre eigenen KI-Kosten, und neue Kunden brauchen keine
// manuelle Konfiguration durch den Entwickler.
//
// SETUP:
//   supabase functions deploy ki-proxy
//   (SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY sind in jeder Edge
//   Function automatisch als Env-Variablen vorhanden, kein extra
//   `secrets set` nötig.)
//
// ENDPOINT: https://<supabase-project>.supabase.co/functions/v1/ki-proxy
// Erwartet: { prompt: string, maxTokens?: number }, Authorization: Bearer <User-JWT>
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function fehlerJSON(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return fehlerJSON("Method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return fehlerJSON("Nicht angemeldet.", 401);

  let prompt: string, maxTokens: number;
  try {
    const body = await req.json();
    prompt = body.prompt;
    maxTokens = body.maxTokens || 1000;
    if (!prompt || typeof prompt !== "string") throw new Error("prompt fehlt");
  } catch {
    return fehlerJSON("Ungültiger JSON-Body (erwartet: { prompt, maxTokens }).", 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Nutzer aus dem JWT identifizieren (Service-Role-Client validiert das Token,
  // ohne selbst RLS zu unterliegen).
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return fehlerJSON("Sitzung ungültig oder abgelaufen.", 401);
  }

  const { data: profil, error: profilError } = await admin
    .from("profile")
    .select("firma_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profilError || !profil?.firma_id) {
    return fehlerJSON("Keiner Firma zugeordnet.", 403);
  }

  const { data: firma, error: firmaError } = await admin
    .from("firmen")
    .select("anthropic_api_key")
    .eq("id", profil.firma_id)
    .maybeSingle();
  if (firmaError || !firma?.anthropic_api_key) {
    return fehlerJSON("Für diese Firma ist noch kein Anthropic-API-Key hinterlegt (Unternehmen → Eigenes Unternehmen bearbeiten).", 412);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": firma.anthropic_api_key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const responseText = await upstream.text();
    if (!upstream.ok) {
      return fehlerJSON(`Anthropic-Anfrage fehlgeschlagen (${upstream.status}): ${responseText.slice(0, 300)}`, upstream.status);
    }
    return new Response(responseText, {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return fehlerJSON(`Verbindung zu Anthropic fehlgeschlagen: ${err}`, 502);
  }
});
