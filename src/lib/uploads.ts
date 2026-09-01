import { supabase } from './supabase';

const slug = (s: string): string => {
  const c = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return c || 'fichier';
};

/** Envoie un fichier vers un bucket public et renvoie son URL publique. */
export async function uploadTo(bucket: string, file: File, prefix: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${slug(prefix)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Supprime un fichier d'un bucket à partir de son URL publique (silencieux). */
export async function deleteFromUrl(bucket: string, url: string): Promise<void> {
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  await supabase.storage.from(bucket).remove([path]);
}
