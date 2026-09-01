// ============================================================================
//  Edge Function : création d'une commande passée depuis la boutique en ligne
// ============================================================================
//  Déploiement : Dashboard Supabase → Edge Functions → Deploy a new function
//               (nom : create-web-order). Laisser la vérification JWT
//               DÉSACTIVÉE (le client public n'est pas connecté).
//  Secrets utilisés : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (fournis auto),
//                     RESEND_API_KEY + EMAIL_FROM (confirmation client).
//
//  Sécurité : TOUS les prix sont recalculés ici à partir de la base. Le client
//  n'envoie que des identifiants et des quantités. Aucun montant reçu du client
//  n'est utilisé. payment_status est forcé à 'en_attente' (le paiement Mollie
//  arrivera en phase 3 et posera 'paye' via un webhook séparé).
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

interface InItem {
  product_id: string;
  qty: number;
  is_confection?: boolean;
  confection_type_id?: string;
  largeur?: number;
  hauteur?: number;
}
interface InBody {
  items: InItem[];
  customer: { first_name?: string; last_name?: string; email?: string; phone?: string };
  fulfillment: 'retrait' | 'livraison';
  pickup_point_id?: string | null;
  address?: { address_line?: string; postal_code?: string; city?: string };
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  try {
    const body = (await req.json()) as InBody;
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // --- validation de base ---------------------------------------------------
    const email = (body.customer?.email ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return json({ error: 'Adresse email invalide.' }, 400);
    const firstName = (body.customer?.first_name ?? '').trim().slice(0, 80);
    const lastName = (body.customer?.last_name ?? '').trim().slice(0, 80);
    if (!firstName || !lastName) return json({ error: 'Nom et prénom requis.' }, 400);
    if (!Array.isArray(body.items) || body.items.length === 0)
      return json({ error: 'Panier vide.' }, 400);
    if (body.items.length > 50) return json({ error: 'Trop d’articles.' }, 400);
    if (body.fulfillment !== 'retrait' && body.fulfillment !== 'livraison')
      return json({ error: 'Mode de livraison invalide.' }, 400);

    // --- données de référence ----------------------------------------------
    const productIds = [...new Set(body.items.map((i) => i.product_id))];
    const [{ data: products }, { data: confTypes }, { data: categories }, { data: company }] =
      await Promise.all([
        admin
          .from('products')
          .select('*')
          .in('id', productIds)
          .eq('published_online', true)
          .eq('active', true),
        admin.from('confection_types').select('*').eq('active', true),
        admin.from('product_categories').select('id, largeur_max'),
        admin.from('company').select('*').eq('id', 1).single(),
      ]);

    const pById = new Map((products ?? []).map((p: any) => [p.id, p]));
    const tById = new Map((confTypes ?? []).map((t: any) => [t.id, t]));
    const catMax = new Map((categories ?? []).map((c: any) => [c.id, c.largeur_max]));

    // --- recalcul de chaque ligne ----------------------------------------
    const lines: any[] = [];
    for (const it of body.items) {
      const p = pById.get(it.product_id);
      if (!p) return json({ error: 'Un article n’est plus disponible.' }, 409);
      const qty = Number(it.qty);
      if (!(qty > 0) || qty > 999) return json({ error: 'Quantité invalide.' }, 400);

      if (it.is_confection) {
        if (!p.confection_category)
          return json({ error: `${p.name} : confection indisponible.` }, 400);
        const t = tById.get(it.confection_type_id ?? '');
        if (!t) return json({ error: `${p.name} : type de confection invalide.` }, 400);
        const L = Number(it.largeur) || 0;
        const H = Number(it.hauteur) || 0;
        const minL = p.largeur_min ?? t.largeur_min ?? null;
        const maxL = p.largeur_max ?? catMax.get(p.category_id) ?? t.largeur_max ?? null;
        if (L <= 0) return json({ error: `${p.name} : largeur manquante.` }, 400);
        if (minL != null && L < minL) return json({ error: `${p.name} : largeur < ${minL} m.` }, 400);
        if (maxL != null && L > maxL) return json({ error: `${p.name} : largeur > ${maxL} m.` }, 400);
        if (p.hauteur_min != null && H > 0 && H < p.hauteur_min)
          return json({ error: `${p.name} : hauteur < ${p.hauteur_min} m.` }, 400);
        if (p.hauteur_max != null && H > 0 && H > p.hauteur_max)
          return json({ error: `${p.name} : hauteur > ${p.hauteur_max} m.` }, 400);

        const metrage = r2(L * Number(t.facteur) + Number(t.marge_fixe));
        const frais =
          p.confection_category === 'tenture' ? Number(t.frais_tenture) : Number(t.frais_rideau_voilage);
        const prixMetre = r2(Number(p.price) + frais);
        const lineTotal = r2(prixMetre * metrage * qty);
        lines.push({
          kind: 'produit',
          label: `${p.name} — ${t.nom}`,
          unit: 'm',
          qty,
          unit_price: prixMetre,
          line_total: lineTotal,
          product_id: p.id,
          is_confection: true,
          confection_type_id: t.id,
          confection_type_label: t.nom,
          confection_category: p.confection_category,
          largeur: L,
          facteur: Number(t.facteur),
          marge_fixe: Number(t.marge_fixe),
          frais_confection: frais,
          metrage,
        });
      } else {
        const lineTotal = r2(Number(p.price) * qty);
        lines.push({
          kind: 'produit',
          label: p.name,
          unit: p.unit,
          qty,
          unit_price: r2(Number(p.price)),
          line_total: lineTotal,
          product_id: p.id,
          is_confection: false,
        });
      }
    }

    const subtotal = r2(lines.reduce((s, l) => s + l.line_total, 0));

    // --- livraison --------------------------------------------------------
    let shipping = 0;
    let pickupId: string | null = null;
    if (body.fulfillment === 'livraison') {
      const a = body.address ?? {};
      if (!((a.address_line ?? '').trim() && (a.postal_code ?? '').trim() && (a.city ?? '').trim()))
        return json({ error: 'Adresse de livraison incomplète.' }, 400);
      const fee = Number(company?.shipping_fee_home) || 0;
      const franco = company?.free_shipping_threshold;
      shipping = franco != null && subtotal >= Number(franco) ? 0 : r2(fee);
    } else {
      if (body.pickup_point_id) {
        const { data: pp } = await admin
          .from('pickup_points')
          .select('id, active')
          .eq('id', body.pickup_point_id)
          .maybeSingle();
        if (!pp || !pp.active) return json({ error: 'Point de retrait invalide.' }, 400);
        pickupId = pp.id;
      }
    }

    const total = r2(subtotal + shipping);

    // --- client (rapproché par email, sinon créé) ------------------------
    const fullName = `${firstName} ${lastName}`.trim();
    const { data: existing } = await admin
      .from('clients')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    let clientId = existing?.id as string | undefined;
    const addr = body.address ?? {};
    const clientPatch = {
      name: fullName,
      client_type: 'particulier',
      first_name: firstName,
      last_name: lastName,
      email,
      phone: (body.customer?.phone ?? '').trim().slice(0, 40),
      address_line: (addr.address_line ?? '').trim(),
      postal_code: (addr.postal_code ?? '').trim(),
      city: (addr.city ?? '').trim(),
      address: [addr.address_line, [addr.postal_code, addr.city].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', '),
    };
    if (clientId) {
      await admin.from('clients').update(clientPatch).eq('id', clientId);
    } else {
      const { data: created, error: cErr } = await admin
        .from('clients')
        .insert(clientPatch)
        .select('id')
        .single();
      if (cErr || !created) return json({ error: 'Création du client impossible.' }, 500);
      clientId = created.id;
    }

    // --- commande --------------------------------------------------------
    const { data: order, error: oErr } = await admin
      .from('orders')
      .insert({
        client_id: clientId,
        status: 'recue',
        is_quote: false,
        channel: 'web',
        payment_status: 'en_attente',
        fulfillment: body.fulfillment,
        pickup_point_id: pickupId,
        shipping_fee: shipping,
        customer_message: (body.message ?? '').trim().slice(0, 2000),
        notes: 'Commande passée sur la boutique en ligne.',
      })
      .select('id, order_number')
      .single();
    if (oErr || !order) return json({ error: 'Création de la commande impossible.' }, 500);

    const rows = lines.map((l, i) => ({ ...l, order_id: order.id, position: i }));
    const { error: iErr } = await admin.from('order_items').insert(rows);
    if (iErr) {
      await admin.from('orders').delete().eq('id', order.id);
      return json({ error: 'Enregistrement des articles impossible.' }, 500);
    }

    // --- email de confirmation (non bloquant) ---------------------------
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const from = Deno.env.get('EMAIL_FROM') ?? 'ATA-TEX <onboarding@resend.dev>';
      const text =
        `Bonjour ${firstName},\n\n` +
        `Nous avons bien reçu votre commande ${order.order_number}.\n` +
        `Montant : ${total.toFixed(2)} € (dont livraison ${shipping.toFixed(2)} €).\n\n` +
        `Nous revenons vers vous très vite pour le paiement et la suite.\n\n` +
        `${company?.name ?? 'ATA-TEX'}`;
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: email,
            subject: `Commande ${order.order_number} bien reçue`,
            text,
          }),
        });
      } catch (_) {
        /* on ignore : la commande est créée */
      }
    }

    return json({
      ok: true,
      order_number: order.order_number,
      subtotal,
      shipping,
      total,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
