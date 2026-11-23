import { createClient } from "jsr:@supabase/supabase-js@2.57.0";

const ORIGIN = "https://appswebb.github.io";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ORIGIN, "Vary": "Origin", "Cache-Control": "no-store" }
});
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, {
    headers: { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" }
  });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "missing_session" }, 401);
    const endpoint = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const publishable = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!endpoint || !serviceKey || !publishable) return json({ error: "missing_supabase_config" }, 503);
    const authClient = createClient(endpoint, publishable, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false } });
    const { data: session, error: authError } = await authClient.auth.getUser(token);
    if (authError || !session.user) return json({ error: "unauthorized" }, 401);
    const payload = await req.json().catch(() => null);
    const ticketId = Number(payload?.ticket_id);
    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) return json({ error: "invalid_ticket" }, 400);
    const service = createClient(endpoint, serviceKey, { auth: { persistSession: false } });
    const { data: ticket, error } = await service.from("entre_support_tickets").select("id,owner_id,category,subject,description,status,email_status").eq("id", ticketId).maybeSingle();
    if (error || !ticket || ticket.owner_id !== session.user.id || ticket.status !== "submitted")
      return json({ error: "ticket_not_found" }, 404);
    if (ticket.email_status === "sent") return json({ email_status: "sent" });
    const { data: evidence, error: proofError } = await service.from("entre_support_evidence").select("object_path").eq("ticket_id", ticketId);
    if (proofError || !evidence?.length) return json({ error: "missing_evidence" }, 400);
    const key = Deno.env.get("RESEND_API_KEY");
    const sender = Deno.env.get("ENTRE_SUPPORT_FROM");
    if (!key || !sender) {
      await service.from("entre_support_tickets").update({ email_status: "unavailable" }).eq("id", ticketId);
      return json({ email_status: "unavailable", message: "Ticket saved. Email delivery is not configured." }, 200);
    }
    const links: string[] = [];
    for (const item of evidence) {
      const { data: signed, error: signError } = await service.storage.from("entre-support-evidence").createSignedUrl(item.object_path, 3600 * 24);
      if (!signError && signed?.signedUrl) links.push(signed.signedUrl);
    }
    const safe = (value: string) => value.replace(/[<>]/g, "");
    const text = [
      "Novo chamado #"+ ticket.id + " — entre.",
      "Conta: "+ session.user.email,
      "Categoria: "+ ticket.category,
      "Assunto: "+ safe(ticket.subject),
      "Descrição:\n"+ safe(ticket.description),
      "Provas privadas (links válidos por 24h):",
      ...links.map((url, i) => String(i+1) + ". " + url)
    ].join("\n\n");
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from: sender, to: ["connectapp.w@gmail.com"], subject: "entre. | Suporte #"+ ticket.id + " — "+ safe(ticket.subject), text })
    });
    if (!sent.ok) {
      await service.from("entre_support_tickets").update({ email_status: "error" }).eq("id", ticketId);
      return json({ email_status: "error", message: "Ticket saved; email provider rejected delivery." });
    }
    await service.from("entre_support_tickets").update({ email_status: "sent", email_sent_at: new Date().toISOString() }).eq("id", ticketId);
    return json({ email_status: "sent" });
  } catch (error) {
    console.error("entre-support-email", String(error));
    return json({ error: "email_delivery_error" }, 500);
  }
});
