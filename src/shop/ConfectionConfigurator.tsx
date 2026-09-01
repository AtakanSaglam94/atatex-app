import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eur, num } from '@/lib/money';
import {
  calculerConfection,
  largeurLimits,
  validerLargeur,
} from '@/lib/confection';
import type { ConfectionType, Product } from '@/types';
import { useCart } from './cart';

interface Props {
  product: Product;
  confectionTypes: ConfectionType[];
  categoryLargeurMax: number | null;
  photo?: string;
}

export function ConfectionConfigurator({
  product,
  confectionTypes,
  categoryLargeurMax,
  photo,
}: Props) {
  const nav = useNavigate();
  const { add } = useCart();

  const [typeId, setTypeId] = useState('');
  const [largeur, setLargeur] = useState('');
  const [hauteur, setHauteur] = useState('');
  const [added, setAdded] = useState(false);

  const type = confectionTypes.find((t) => t.id === typeId) ?? null;
  const L = parseFloat(largeur.replace(',', '.')) || 0;
  const H = parseFloat(hauteur.replace(',', '.')) || 0;

  const limits = useMemo(
    () => largeurLimits(type, categoryLargeurMax, product),
    [type, categoryLargeurMax, product],
  );

  const error = useMemo(() => {
    if (!type) return 'Choisissez un type de confection.';
    const le = validerLargeur(L, limits);
    if (le) return le;
    if (product.hauteur_min != null && H > 0 && H < product.hauteur_min)
      return `Hauteur minimale : ${product.hauteur_min} m.`;
    if (product.hauteur_max != null && H > 0 && H > product.hauteur_max)
      return `Hauteur maximale pour ce tissu : ${product.hauteur_max} m.`;
    if (H <= 0) return 'Indiquez la hauteur souhaitée (m).';
    return null;
  }, [type, L, H, limits, product]);

  const calc = useMemo(() => {
    if (error || !type) return null;
    return calculerConfection({
      largeur: L,
      prixTissuAuMetre: product.price,
      categorie: product.confection_category ?? 'rideau_voilage',
      type,
    });
  }, [error, type, L, product]);

  function addToCart() {
    if (!calc || !type) return;
    add({
      product_id: product.id,
      name: `${product.name} — ${type.nom}`,
      unit: 'm',
      unit_price: calc.prixAuMetreTotal,
      qty: calc.metrage,
      line_total: calc.prixTotal,
      photo,
      is_confection: true,
      confection_type_id: type.id,
      confection_type_label: type.nom,
      largeur: L,
      hauteur: H,
      metrage: calc.metrage,
    });
    setAdded(true);
    setTimeout(() => nav('/panier'), 500);
  }

  const limitHint = [
    limits.min != null && `largeur min ${num(limits.min)} m`,
    limits.max != null && `largeur max ${num(limits.max)} m`,
    product.hauteur_max != null && `hauteur max ${num(product.hauteur_max)} m`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
      }}
    >
      <strong style={{ fontSize: 15 }}>Configurez votre confection</strong>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Type de confection</label>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">Choisir…</option>
          {confectionTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Largeur souhaitée (m)</label>
          <input
            inputMode="decimal"
            value={largeur}
            onChange={(e) => setLargeur(e.target.value)}
            placeholder="ex. 2,40"
          />
        </div>
        <div className="field">
          <label>Hauteur souhaitée (m)</label>
          <input
            inputMode="decimal"
            value={hauteur}
            onChange={(e) => setHauteur(e.target.value)}
            placeholder="ex. 2,60"
          />
        </div>
      </div>

      {limitHint && (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>{limitHint}</div>
      )}

      {calc ? (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--thread-weak)',
            fontSize: 13.5,
          }}
        >
          {num(calc.metrage)} m de tissu · {eur(calc.prixAuMetreTotal)}/m
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 4 }}>
            {eur(calc.prixTotal)}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{error}</div>
      )}

      <button
        className="btn btn--primary"
        style={{ marginTop: 12 }}
        disabled={!calc || added}
        onClick={addToCart}
      >
        {added ? 'Ajouté ✓' : 'Ajouter au panier'}
      </button>
    </div>
  );
}
