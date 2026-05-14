import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshTokenIfNeeded(supabase: any, companyId: string, integration: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(integration.gmail_token_expires_at);
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) return integration.gmail_access_token;

  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: integration.gmail_refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResponse.ok) throw new Error("Falha ao renovar token do Gmail");
  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await supabase
    .from("tenant_integrations")
    .update({
      gmail_access_token: tokens.access_token,
      gmail_token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);
  return tokens.access_token;
}

function b64urlDecode(s: string): string {
  try {
    const pad = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
    const bin = atob(padded);
    // decode UTF-8
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function getHeader(headers: any[], name: string): string {
  const h = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

function extractBody(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";
  const walk = (part: any) => {
    if (!part) return;
    const mime = part.mimeType || "";
    const data = part.body?.data;
    if (data) {
      if (mime === "text/plain" && !text) text = b64urlDecode(data);
      else if (mime === "text/html" && !html) html = b64urlDecode(data);
    }
    if (part.parts) part.parts.forEach(walk);
  };
  walk(payload);
  return { text, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, company_id } = body;
    if (!action || !company_id) {
      return new Response(JSON.stringify({ error: "action e company_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: integration } = await supabase
      .from("tenant_integrations")
      .select("gmail_access_token, gmail_refresh_token, gmail_token_expires_at, gmail_email, gmail_status")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!integration || integration.gmail_status !== "connected") {
      return new Response(JSON.stringify({ error: "Gmail não conectado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await refreshTokenIfNeeded(supabase, company_id, integration);
    const auth = { Authorization: `Bearer ${token}` };

    if (action === "list") {
      const { q = "in:inbox", max = 25, pageToken } = body;
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads");
      url.searchParams.set("maxResults", String(max));
      url.searchParams.set("q", q);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const r = await fetch(url.toString(), { headers: auth });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: "Falha ao listar", details: t }), {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const list = await r.json();
      const threads = list.threads || [];
      // Buscar metadata em paralelo (limitado)
      const enriched = await Promise.all(
        threads.slice(0, max).map(async (t: any) => {
          const tr = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To`,
            { headers: auth },
          );
          if (!tr.ok) return { id: t.id, snippet: t.snippet };
          const td = await tr.json();
          const last = td.messages?.[td.messages.length - 1];
          const headers = last?.payload?.headers || [];
          const labels: string[] = last?.labelIds || [];
          return {
            id: td.id,
            snippet: last?.snippet || td.snippet || "",
            from: getHeader(headers, "From"),
            to: getHeader(headers, "To"),
            subject: getHeader(headers, "Subject"),
            date: getHeader(headers, "Date"),
            internalDate: last?.internalDate,
            unread: labels.includes("UNREAD"),
            messageCount: td.messages?.length || 1,
          };
        }),
      );
      return new Response(
        JSON.stringify({ threads: enriched, nextPageToken: list.nextPageToken || null, gmail_email: integration.gmail_email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "thread") {
      const { thread_id } = body;
      if (!thread_id) {
        return new Response(JSON.stringify({ error: "thread_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread_id}?format=full`, { headers: auth });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: "Falha ao carregar thread", details: t }), {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const td = await r.json();
      const messages = (td.messages || []).map((m: any) => {
        const headers = m.payload?.headers || [];
        const { text, html } = extractBody(m.payload);
        const from = getHeader(headers, "From");
        const fromMe = from.toLowerCase().includes((integration.gmail_email || "").toLowerCase());
        return {
          id: m.id,
          threadId: m.threadId,
          from,
          to: getHeader(headers, "To"),
          subject: getHeader(headers, "Subject"),
          date: getHeader(headers, "Date"),
          internalDate: m.internalDate,
          messageId: getHeader(headers, "Message-ID"),
          references: getHeader(headers, "References"),
          text,
          html,
          fromMe,
          unread: (m.labelIds || []).includes("UNREAD"),
        };
      });
      // Marcar como lido
      try {
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread_id}/modify`, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
        });
      } catch (_) {}
      return new Response(JSON.stringify({ thread_id, messages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    return new Response(JSON.stringify({ error: "Erro interno", details: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
