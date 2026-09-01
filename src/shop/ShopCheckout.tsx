import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { eur } from '@/lib/money';
import { pickupPointLabel } from '@/lib/format';
import { useCart } from './cart';
import { useShopCatalog } from './useShopCatalog';

type Fulfillment = 'retrait' | 'livraison';

export function ShopCheckout() {
  const nav = useNavigate();
  const { lines, subtotal, clear } = useCart();
  const { pickupPoints, settings } = useShopCatalog();

  const [c, setC] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [fulfillment, setFulfillment] = useState<Fulfillment>('retrait');
  const [pickupId, setPickupId] = useState('');
  const [addr, setAddr] = useState({ address_line: '', postal_code: '', city: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shipping = useMemo(() => {
    if (fulfillment !== 'livraison') return 0;
    const { shipping_fee_home, free_shipping_threshold } = settings;
    if (free_shipping_threshold != null && subtotal >= free_shipping_threshold) return 0;
    return shipping_fee_home;
  }, [fulfillment, settings, subtotal]);

  const total = Math.round((subtotal + shipping) * 100) / 100;

  if (lines.length === 0) {
    return (
      <div className="shop-notice">
        Votre panier est vide. <Link to="/">Voir la boutique</Link>
      </div>
    );
  }

  async function submit() {
    setErr(null);
    if (!c.first_name.trim() || !c.last_name.trim()) return setErr('Indiquez votre nom et prénom.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email.trim())) return setErr('Adresse email invalide.');
    if (fulfillment === 'retrait' && !pickupId) return setErr('Choisissez un point de retrait.');
    if (
      fulfillment === 'livraison' &&
      !(addr.address_line.trim() && addr.postal_code.trim() && addr.city.trim())
    )
      return setErr('Complétez votre adresse de livraison.');

    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-web-order', {
      body: {
        items: lines.map((l) => ({
          product_id: l.product_id,
          qty: l.qty,
          is_confection: l.is_confection,
          confection_type_id: l.confection_type_id,
          largeur: l.largeur,
          hauteur: l.hauteur,
        })),
        customer: c,
        fulfillment,
        pickup_point_id: fulfillment === 'retrait' ? pickupId : null,
        address: fulfillment === 'livraison' ? addr : undefined,
        message,
      },
    });
    setBusy(false);

    if (error || (data && data.error)) {
      setErr((data && data.error) || 'La commande n’a pas pu être enregistrée. Réessayez.');
      return;
    }
    clear();
    nav('/commande-confirmee', {
      state: { order_number: data.order_number, total: data.total, email: c.email.trim() },
    });
  }

  return (
    <>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>
        Finaliser la commande
      </h1>
      <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginBottom: 20 }}>
        Vous recevrez un email de confirmation. Le règlement (Bancontact) vous sera proposé
        juste après — ou convenu avec nous pour un retrait.
      </p>

      {err && <div className="shop-notice" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="shop-checkout-grid">
        <div>
          <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>Vos coordonnées</h3>
          <div className="field-row">
            <div className="field">
              <label>Prénom</label>
              <input value={c.first_name} onChange={(e) => setC({ ...c, first_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Nom</label>
              <input value={c.last_name} onChange={(e) => setC({ ...c, last_name: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={c.email}
                onChange={(e) => setC({ ...c, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: '18px 0 10px' }}>Livraison</h3>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 6 }}>
            <input
              type="radio"
              checked={fulfillment === 'retrait'}
              onChange={() => setFulfillment('retrait')}
            />
            Retrait (marché / atelier) — gratuit
          </label>
          {fulfillment === 'retrait' && (
            <div className="field">
              <select value={pickupId} onChange={(e) => setPickupId(e.target.value)}>
                <option value="">Choisir un point de retrait…</option>
                {pickupPoints.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pickupPointLabel(p)}
                    {p.address ? ` — ${p.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '6px 0' }}>
            <input
              type="radio"
              checked={fulfillment === 'livraison'}
              onChange={() => setFulfillment('livraison')}
            />
            Livraison à domicile
            {settings.shipping_fee_home > 0 ? ` — ${eur(settings.shipping_fee_home)}` : ''}
            {settings.free_shipping_threshold != null
              ? ` (offerte dès ${eur(settings.free_shipping_threshold)})`
              : ''}
          </label>
          {fulfillment === 'livraison' && (
            <>
              <div className="field">
                <label>Adresse</label>
                <input
                  value={addr.address_line}
                  onChange={(e) => setAddr({ ...addr, address_line: e.target.value })}
                  placeholder="Rue et numéro"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Code postal</label>
                  <input
                    value={addr.postal_code}
                    onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Ville</label>
                  <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                </div>
              </div>
            </>
          )}

          <div className="field" style={{ marginTop: 10 }}>
            <label>Message (facultatif)</label>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <div>
          <div
            style={{
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius)',
              padding: 16,
              position: 'sticky',
              top: 90,
            }}
          >
            <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>Récapitulatif</h3>
            {lines.map((l) => (
              <div
                key={l.key}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}
              >
                <span style={{ maxWidth: 170 }}>
                  {l.name}
                  {l.is_confection ? '' : ` × ${l.qty}`}
                </span>
                <span className="mono">{eur(l.line_total ?? l.unit_price * l.qty)}</span>
              </div>
            ))}
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Sous-total</span>
              <span className="mono">{eur(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '4px 0' }}>
              <span>Livraison</span>
              <span className="mono">{shipping > 0 ? eur(shipping) : 'Gratuit'}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              <span>Total</span>
              <span className="mono">{eur(total)}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '6px 0 12px' }}>
              TVA 21 % comprise.
            </p>
            <button
              className="btn btn--primary"
              style={{ width: '100%' }}
              disabled={busy}
              onClick={submit}
            >
              {busy ? 'Envoi…' : 'Confirmer la commande'}
            </button>
            <Link
              to="/panier"
              style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12.5 }}
            >
              ← Retour au panier
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
