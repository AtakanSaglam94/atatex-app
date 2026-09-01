// ============================================================================
//  Edge Function : envoi des demandes d'avis (J+7 après « Terminé »)
// ============================================================================
//  Déclenchée chaque jour par pg_cron (voir migration 0008).
//  Déploiement : Dashboard Supabase, ou `supabase functions deploy send-review-emails --no-verify-jwt`
//  Secrets : CRON_SECRET (obligatoire), RESEND_API_KEY, EMAIL_FROM
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-key') !== secret) {
    return json({ error: 'non autorisé' }, 401);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const [{ data: tpl }, { data: company }] = await Promise.all([
    admin.from('email_templates').select('*').eq('template_key', 'avis').single(),
    admin.from('company').select('name, google_review_url, website_url').eq('id', 1).single(),
  ]);
  if (!tpl || !tpl.enabled) return json({ skipped: 'modèle avis absent ou désactivé' });

  const now = Date.now();
  const from8 = new Date(now - 8 * 864e5).toISOString();
  const to7 = new Date(now - 7 * 864e5).toISOString();

  const { data: orders } = await admin
    .from('orders')
    .select('id, order_number, completed_at, client:clients(name, email)')
    .eq('status', 'termine')
    .gte('completed_at', from8)
    .lt('completed_at', to7);

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'ATA-TEX <onboarding@resend.dev>';
  let sent = 0;
  const results: unknown[] = [];

  for (const o of orders ?? []) {
    const client = Array.isArray(o.client) ? o.client[0] : o.client;
    const to = client?.email?.trim();
    if (!to) continue;

    // déjà envoyé ?
    const { count } = await admin
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', o.id)
      .eq('template_key', 'avis');
    if ((count ?? 0) > 0) continue;

    const vars = {
      client: client?.name ?? '',
      numero: o.order_number,
      entreprise: company?.name ?? 'ATA-TEX',
      lien_google: company?.google_review_url ?? '',
      lien_site: company?.website_url ?? '',
    };

    if (!resendKey) {
      await admin.from('email_log').insert({
        order_id: o.id, template_key: 'avis', to_email: to,
        status: 'error', error: 'RESEND_API_KEY absente',
      });
      continue;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject: fill(tpl.subject, vars),
        text: fill(tpl.body, vars),
      }),
    });
    const body = await res.json();
    await admin.from('email_log').insert({
      order_id: o.id, template_key: 'avis', to_email: to,
      status: res.ok ? 'sent' : 'error',
      error: res.ok ? null : JSON.stringify(body),
    });
    if (res.ok) sent += 1;
    results.push({ order: o.order_number, ok: res.ok });
  }

  return json({ candidates: orders?.length ?? 0, sent, results });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
