export const ERFASST_PROXY = "https://DEIN-PROJEKT.supabase.co/functions/v1/erfasst-proxy";

export async function erfasstQuery(query, variables = {}) {
  try {
    const res = await fetch(ERFASST_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || "GraphQL Fehler");
    return data.data;
  } catch (e) {
    throw e;
  }
}
