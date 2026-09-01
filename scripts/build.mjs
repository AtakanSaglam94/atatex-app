// Netlify lance ce script pour les DEUX sites (même dépôt).
// On choisit la cible selon le site : boutique publique vs app de gestion.
import { execFileSync } from 'node:child_process';

// Priorité 1 : variable explicite BUILD_TARGET=shop (à définir sur le site boutique).
// Priorité 2 : le nom du site Netlify contient "boutique" ou "shop".
const explicit = (process.env.BUILD_TARGET ?? '').toLowerCase();
const siteName = (process.env.SITE_NAME ?? '').toLowerCase();
const isShop =
  explicit === 'shop' ||
  explicit === 'boutique' ||
  (explicit !== 'gestion' && /boutique|shop/.test(siteName));
console.log(`[build] cible = ${isShop ? 'BOUTIQUE (public)' : 'GESTION (privé)'}`);

// Binaires appelés via leur point d'entrée JS → indépendant du PATH.
const run = (args) => execFileSync(process.execPath, args, { stdio: 'inherit' });

run(['node_modules/typescript/bin/tsc', '-b']);
run(
  isShop
    ? ['node_modules/vite/bin/vite.js', 'build', '--mode', 'shop', '--outDir', 'dist']
    : ['node_modules/vite/bin/vite.js', 'build'],
);
