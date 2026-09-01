import { supabase } from './supabase';
import { downloadFile } from './ubl';

const TABLES = [
  'company',
  'product_categories',
  'confection_types',
  'services',
  'pickup_points',
  'products',
  'clients',
  'orders',
  'order_items',
  'email_templates',
  'email_log',
  'profiles',
] as const;

export interface BackupFile {
  app: 'atatex';
  version: number;
  exported_at: string;
  tables: Record<string, unknown[]>;
}

/**
 * Télécharge une sauvegarde complète (toutes les tables) au format JSON.
 * Ce fichier est un instantané : il permet de tout ré-importer en cas de besoin.
 */
export async function exportAllData(): Promise<{ rows: number }> {
  const tables: Record<string, unknown[]> = {};
  let total = 0;

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`${table} : ${error.message}`);
    tables[table] = data ?? [];
    total += tables[table].length;
  }

  const payload: BackupFile = {
    app: 'atatex',
    version: 1,
    exported_at: new Date().toISOString(),
    tables,
  };

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  downloadFile(`atatex-sauvegarde-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
  return { rows: total };
}
