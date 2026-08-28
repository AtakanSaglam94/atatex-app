import { supabase } from './supabase';

const BUCKET = 'product-photos';
export const MAX_PHOTOS = 5;

const slug = (s: string): string => {
  const cleaned = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return cleaned || 'produit';
};

/** Envoie un fichier image et renvoie son URL publique. */
export async function uploadProductPhoto(file: File, productName: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${slug(productName)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Supprime une photo du stockage à partir de son URL publique (silencieux si échec). */
export async function deleteProductPhoto(url: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  await supabase.storage.from(BUCKET).remove([path]);
}
