// ============================================================================
//  Edge Function : envoi d'un email au client à chaque changement de statut
// ============================================================================
//  Déploiement : via le Dashboard Supabase (Edge Functions → Deploy a new
//  function) ou `supabase functions deploy send-status-email`.
//  Appelée par l'app avec la session de l'utilisateur → laisser la
//  vérification JWT activée (réglage par défaut).
//  Secrets à définir (Supabase → Edge Functions → Secrets) :
//    RESEND_API_KEY = re_...
//    EMAIL_FROM     = "ATA-TEX <commande@ata-tex.be>"
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  order_id: string;
  template_key: string;
}

function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { order_id, template_key } = (await req.json()) as Payload;
    if (!order_id || !template_key) {
      return json({ error: 'order_id et template_key requis' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [{ data: order }, { data: tpl }, { data: company }] = await Promise.all([
      admin
        .from('orders')
        .select('id, order_number, client:clients(name, email), pickup:pickup_points(name, day)')
        .eq('id', order_id)
        .single(),
      admin.from('email_templates').select('*').eq('template_key', template_key).single(),
      admin.from('company').select('name').eq('id', 1).single(),
    ]);

    if (!order) return json({ error: 'Commande introuvable' }, 404);
    if (!tpl || !tpl.enabled) return json({ skipped: 'modèle absent ou désactivé' }, 200);

    const client = Array.isArray(order.client) ? order.client[0] : order.client;
    const to = client?.email?.trim();
    if (!to) {
      await admin.from('email_log').insert({
        order_id, template_key, to_email: '', status: 'error',
        error: 'Le client n\'a pas d\'adresse email',
      });
      return json({ skipped: 'client sans email' }, 200);
    }

    const pickup = Array.isArray(order.pickup) ? order.pickup[0] : order.pickup;
    const vars = {
      client: client?.name ?? '',
      numero: order.order_number,
      entreprise: company?.name ?? 'ATA-TEX',
      point: pickup?.name ?? '',
      jour: pickup?.day ?? '',
    };
    const subject = fill(tpl.subject, vars);
    const text = fill(tpl.body, vars);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('EMAIL_FROM') ?? 'ATA-TEX <onboarding@resend.dev>';

    if (!resendKey) {
      await admin.from('email_log').insert({
        order_id, template_key, to_email: to, status: 'error',
        error: 'RESEND_API_KEY non configurée',
      });
      return json({ error: 'RESEND_API_KEY non configurée' }, 500);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text }),
    });
    const body = await res.json();

    await admin.from('email_log').insert({
      order_id, template_key, to_email: to,
      status: res.ok ? 'sent' : 'error',
      error: res.ok ? null : JSON.stringify(body),
    });

    return json({ ok: res.ok, id: body?.id ?? null }, res.ok ? 200 : 502);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
