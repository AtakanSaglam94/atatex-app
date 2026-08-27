import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Message explicite au démarrage plutôt qu'une erreur obscure plus loin.
  throw new Error(
    'Configuration Supabase manquante. Créez un fichier .env.local à partir de .env.example ' +
      'et renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Appelle l'Edge Function d'envoi d'email (ne bloque jamais le flux si elle échoue). */
export async function sendStatusEmail(orderId: string, templateKey: string): Promise<void> {
  try {
    await supabase.functions.invoke('send-status-email', {
      body: { order_id: orderId, template_key: templateKey },
    });
  } catch (e) {
    console.warn('Envoi email statut échoué (non bloquant) :', e);
  }
}
