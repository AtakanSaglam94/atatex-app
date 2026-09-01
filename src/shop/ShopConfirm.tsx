import { Link, useLocation } from 'react-router-dom';
import { eur } from '@/lib/money';

export function ShopConfirm() {
  const { state } = useLocation() as {
    state: { order_number?: string; total?: number; email?: string } | null;
  };

  return (
    <div style={{ maxWidth: 520, margin: '30px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>✓</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 10 }}>
        Merci, votre commande est enregistrée
      </h1>
      {state?.order_number && (
        <p style={{ fontSize: 15 }}>
          Numéro : <strong>{state.order_number}</strong>
          {state.total != null && (
            <>
              {' '}
              — {eur(state.total)}
            </>
          )}
        </p>
      )}
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
        Un email de confirmation part vers {state?.email ? <strong>{state.email}</strong> : 'votre adresse'}.
        Nous vous recontactons rapidement pour le règlement et la préparation.
      </p>
      <Link to="/" className="btn btn--primary" style={{ marginTop: 20 }}>
        Retour à la boutique
      </Link>
    </div>
  );
}
