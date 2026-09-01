import { Link, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Pages légales — modèles pour une boutique belge (B2C).
 * À FAIRE RELIRE par un juriste / comptable et compléter les champs entre
 * crochets (n° BCE, adresse du siège, etc.) dans Réglages → Entreprise
 * (repris automatiquement quand ce sera branché).
 */

const COMPANY = {
  name: 'ATA-TEX',
  legal: '[forme juridique — ex. SRL / personne physique]',
  address: '[adresse du siège social], Bruxelles, Belgique',
  bce: '[numéro BCE / TVA : BE 0xxx.xxx.xxx]',
  email: 'commande@ata-tex.be',
  phone: '[numéro de téléphone]',
};

const PAGES: Record<string, { title: string; body: ReactNode }> = {
  'mentions-legales': {
    title: 'Mentions légales',
    body: (
      <>
        <p>
          Le site <strong>ata-tex.be</strong> est édité par {COMPANY.name}, {COMPANY.legal}, dont le
          siège est situé {COMPANY.address}.
        </p>
        <p>
          Numéro d'entreprise&nbsp;: {COMPANY.bce}
          <br />
          Email&nbsp;: {COMPANY.email} — Téléphone&nbsp;: {COMPANY.phone}
        </p>
        <p>
          Hébergement&nbsp;: Netlify, Inc. — Base de données&nbsp;: Supabase. Les paiements en ligne
          sont traités par Mollie B.V., prestataire de services de paiement agréé.
        </p>
        <p>
          L'ensemble des contenus du site (textes, photos, logo) est la propriété de{' '}
          {COMPANY.name} et ne peut être reproduit sans autorisation.
        </p>
      </>
    ),
  },
  cgv: {
    title: 'Conditions générales de vente',
    body: (
      <>
        <h3>1. Champ d'application</h3>
        <p>
          Les présentes conditions régissent les ventes conclues sur ata-tex.be entre{' '}
          {COMPANY.name} et tout client consommateur. Toute commande implique leur acceptation.
        </p>
        <h3>2. Produits et prix</h3>
        <p>
          Les produits sont décrits avec le plus grand soin. Les prix sont indiqués en euros, toutes
          taxes comprises (TVA belge 21&nbsp;%), hors frais de livraison indiqués avant validation de
          la commande. {COMPANY.name} se réserve le droit de modifier ses prix à tout moment, le prix
          applicable étant celui en vigueur au moment de la commande.
        </p>
        <h3>3. Confection sur mesure</h3>
        <p>
          Les articles confectionnés aux dimensions indiquées par le client (largeur, hauteur, type
          de confection) sont réalisés spécialement&nbsp;: conformément à l'article VI.53 du Code de
          droit économique, <strong>le droit de rétractation ne s'applique pas</strong> à ces
          articles. Les dimensions communiquées par le client engagent sa responsabilité.
        </p>
        <h3>4. Commande et paiement</h3>
        <p>
          La commande est ferme après confirmation et paiement. Le paiement s'effectue en ligne
          (Bancontact, carte) via Mollie, ou selon les modalités convenues pour un retrait.
        </p>
        <h3>5. Livraison et retrait</h3>
        <p>
          Retrait gratuit aux points de marché ou à l'atelier, aux jours indiqués. Livraison à
          domicile en Belgique selon les frais affichés. Les délais sont communiqués à titre
          indicatif&nbsp;; un retard raisonnable n'ouvre pas droit à annulation ou indemnité.
        </p>
        <h3>6. Droit de rétractation</h3>
        <p>
          Pour les articles standard (non sur mesure), le client dispose de 14 jours pour se
          rétracter — voir la page <Link to="/retractation">Droit de rétractation</Link>.
        </p>
        <h3>7. Garantie</h3>
        <p>
          Les produits bénéficient de la garantie légale de conformité de 2 ans (articles 1649bis et
          suivants du Code civil).
        </p>
        <h3>8. Données personnelles</h3>
        <p>
          Voir la page <Link to="/confidentialite">Confidentialité</Link>.
        </p>
        <h3>9. Litiges</h3>
        <p>
          Droit belge applicable. En cas de litige, le client peut recourir à la plateforme
          européenne de règlement en ligne des litiges (ec.europa.eu/consumers/odr) ou au Service de
          médiation pour le consommateur (Belgique).
        </p>
      </>
    ),
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    body: (
      <>
        <p>
          {COMPANY.name} traite vos données personnelles conformément au RGPD, uniquement pour
          gérer vos commandes.
        </p>
        <h3>Données collectées</h3>
        <p>Nom, prénom, email, téléphone, adresse de livraison, détail des commandes.</p>
        <h3>Finalités</h3>
        <p>
          Traitement et suivi des commandes, facturation, service client, obligations comptables et
          fiscales.
        </p>
        <h3>Destinataires</h3>
        <p>
          {COMPANY.name} et ses prestataires strictement nécessaires&nbsp;: paiement (Mollie),
          hébergement (Supabase, Netlify), envoi d'emails (Resend). Aucune donnée n'est vendue.
        </p>
        <h3>Conservation</h3>
        <p>
          Durée de la relation commerciale puis délais légaux de conservation comptable (7 ans en
          Belgique).
        </p>
        <h3>Vos droits</h3>
        <p>
          Accès, rectification, effacement, opposition&nbsp;: écrivez à {COMPANY.email}. Vous pouvez
          aussi introduire une réclamation auprès de l'Autorité de protection des données
          (autoriteprotectiondonnees.be).
        </p>
        <h3>Cookies</h3>
        <p>
          Le site n'utilise que le stockage local nécessaire au panier. Aucun cookie publicitaire ou
          de suivi tiers.
        </p>
      </>
    ),
  },
  retractation: {
    title: 'Droit de rétractation',
    body: (
      <>
        <p>
          Pour les articles standard, vous disposez de <strong>14 jours calendrier</strong> à
          compter de la réception pour nous informer de votre souhait de vous rétracter, sans avoir à
          vous justifier.
        </p>
        <p>
          <strong>Exception&nbsp;:</strong> les articles confectionnés sur mesure (rideaux, voilages,
          tentures réalisés aux dimensions que vous avez indiquées) sont exclus du droit de
          rétractation (art. VI.53, 3° du Code de droit économique).
        </p>
        <h3>Comment se rétracter</h3>
        <p>
          Envoyez un email à {COMPANY.email} en indiquant votre numéro de commande et les articles
          concernés. Renvoyez les produits en parfait état, dans leur emballage d'origine, dans les
          14 jours suivant votre notification. Les frais de retour sont à votre charge.
        </p>
        <h3>Remboursement</h3>
        <p>
          Nous vous remboursons dans les 14 jours suivant la réception des articles retournés (ou la
          preuve de leur expédition), par le même moyen de paiement.
        </p>
      </>
    ),
  },
};

export function ShopLegal() {
  const { slug = '' } = useParams();
  const page = PAGES[slug];

  if (!page) {
    return (
      <div className="shop-notice">
        Page introuvable. <Link to="/">Retour à la boutique</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.65, fontSize: 14 }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        ← Boutique
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '8px 0 18px' }}>
        {page.title}
      </h1>
      <div className="shop-legal">{page.body}</div>
      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--ink-faint)' }}>
        Dernière mise à jour&nbsp;: à compléter. Document à faire valider.
      </p>
    </div>
  );
}
