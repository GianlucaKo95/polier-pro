// ═══════════════════════════════════════════════════════════════════════
// Supabase Edge Function: 123erfasst GraphQL Proxy
// ═══════════════════════════════════════════════════════════════════════
//
// SETUP:
//   1. supabase functions deploy erfasst-proxy
//   2. supabase secrets set ERFASST_API_KEY=<API-Key aus 123erfasst>
//   3. supabase secrets set ERFASST_SERVER=<z.B. meinefirma.123erfasst.de>
//
// ENDPOINT: https://<supabase-project>.supabase.co/functions/v1/erfasst-proxy
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // Serverseitige Credentials (niemals im Frontend!)
  const API_KEY = Deno.env.get("ERFASST_API_KEY") ?? "";
  const SERVER  = Deno.env.get("ERFASST_SERVER")  ?? "";

  if (!API_KEY || !SERVER) {
    return new Response(
      JSON.stringify({ errors: [{ message: "Server-Konfiguration fehlt (ERFASST_API_KEY / ERFASST_SERVER)" }] }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Body aus dem Frontend übernehmen (GraphQL query + variables)
  let body: string;
  let parsed: { query?: string };
  try {
    body = await req.text();
    parsed = JSON.parse(body);
  } catch {
    return new Response(
      JSON.stringify({ errors: [{ message: "Ungültiger JSON-Body" }] }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // ─── Sicherheit: nur lesende Queries erlaubt ────────────────────────────
  // Mutations (Schreiben/Ändern/Löschen) werden serverseitig blockiert,
  // unabhängig davon was das Frontend schickt.
  const queryText = (parsed.query || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (
    queryText.startsWith("mutation") ||
    queryText.includes("mutation ") ||
    queryText.includes("create") ||
    queryText.includes("update") ||
    queryText.includes("delete") ||
    queryText.includes("upsert")
  ) {
    return new Response(
      JSON.stringify({ errors: [{ message: "Schreibzugriffe sind über diesen Proxy nicht erlaubt." }] }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  // 123erfasst GraphQL aufrufen
  try {
    const upstream = await fetch(`https://${SERVER}/api/graphql`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        // Basic Auth: API-Key als Username, leeres Passwort
        "Authorization": `Basic ${btoa(API_KEY + ":")}`,
      },
      body: JSON.stringify(parsed),
    });

    const responseText = await upstream.text();

    return new Response(responseText, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ errors: [{ message: `Verbindung zu 123erfasst fehlgeschlagen: ${err}` }] }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
