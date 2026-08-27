// ============================================================================
//  Edge Function : création d'un compte utilisateur par un administrateur
// ============================================================================
//  Déploiement : supabase functions deploy admin-create-user
//  (garde la vérification JWT activée : on identifie l'appelant)
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Identifier l'appelant à partir de son jeton
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await caller.auth.getUser();
    if (!userData.user) return json({ error: 'Non authentifié' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('role, active')
      .eq('id', userData.user.id)
      .single();
    if (profile?.role !== 'admin' || !profile.active) {
      return json({ error: 'Réservé aux administrateurs' }, 403);
    }

    // 2. Créer le compte
    const { email, password, full_name, role } = await req.json();
    if (!email || !password) return json({ error: 'Email et mot de passe requis' }, 400);
    if (String(password).length < 8) return json({ error: 'Mot de passe : 8 caractères minimum' }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: full_name ?? '', role: role === 'admin' ? 'admin' : 'travailleur' },
    });
    if (error) return json({ error: error.message }, 400);

    // Le trigger handle_new_user crée le profil ; on force le rôle au cas où.
    await admin
      .from('profiles')
      .update({ full_name: full_name ?? '', role: role === 'admin' ? 'admin' : 'travailleur' })
      .eq('id', created.user!.id);

    return json({ ok: true, id: created.user!.id });
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
