export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** Formatage monétaire belge : 1 234,56 € */
export function eur(n: number): string {
  return (Number(n) || 0).toLocaleString('fr-BE', {
    style: 'currency',
    currency: 'EUR',
  });
}

/** Nombre avec séparateurs belges. */
export function num(n: number, min = 0, max = 2): string {
  return (Number(n) || 0).toLocaleString('fr-BE', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/** Arrondi « caisse » : à l'euro le plus proche (pratique pour les espèces au marché). */
export function roundCash(n: number): number {
  return Math.round(Number(n) || 0);
}
