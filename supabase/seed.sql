-- ============================================================================
--  ATA-TEX — données de départ
--  À exécuter APRÈS supabase/migrations/0001_init.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Entreprise (à compléter dans Réglages une fois connecté)
-- ---------------------------------------------------------------------------
insert into company (id, name, legal_form, vat, address, iban, email, phone, vat_rate)
values (1, 'ATA-TEX', '', 'BE0000000000', 'Bruxelles', '', '', '', 21)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  Catégories de produits
--  largeur_max : surcharge la largeur maxi du type de confection pour les
--  produits de cette catégorie (utile pour les stores — 2,50 m sur tenture).
-- ---------------------------------------------------------------------------
insert into product_categories (name, position, largeur_max) values
  ('Voilage',    10, null),
  ('Rideau',     20, null),
  ('Tenture',    30, null),
  ('Store',      40, null),
  ('Ruflette',   45, null),
  ('Accessoire', 50, null)
on conflict (name) do nothing;
-- Limites de largeur : priorité produit > catégorie > type de confection.
-- Ex. store : type "Store" = min 0,50 / max 3,00 (cas voilage) ; une toile de
-- store destinée aux tentures reçoit largeur_max = 2,50 sur SA fiche produit.

-- ---------------------------------------------------------------------------
--  Types de confection (modifiables par l'admin)
--  m = largeur × facteur + marge_fixe
--  prix = (prix_tissu_au_metre + frais_selon_categorie_produit) × m
--  frais : colonne rideau_voilage / tenture selon la catégorie du produit.
-- ---------------------------------------------------------------------------
insert into confection_types
  (nom, facteur, marge_fixe, frais_rideau_voilage, frais_tenture, largeur_min, largeur_max, position) values
  ('Froncé',   2.0, 0.20,   4,   5, null, null, 10),
  ('Plié',     3.0, 0.20,   4,   5, null, null, 20),
  ('Plis',     2.5, 0.20,   4,   5, null, null, 30),
  ('Wave 6cm', 2.8, 0.20,  10,  10, null, null, 40),
  ('Wave 8cm', 2.2, 0.20,  10,  10, null, null, 50),
  ('Store',    1.0, 0.00, 120, 120, 0.50, 3.00, 60);

-- ---------------------------------------------------------------------------
--  Services facturables (modifiables par l'admin)
-- ---------------------------------------------------------------------------
insert into services (name, price, position) values
  ('Prise de mesure',   30, 10),
  ('Livraison',         25, 20),
  ('Pose à domicile',   60, 30);

-- ---------------------------------------------------------------------------
--  Modèles d'emails (variables : {client}, {numero}, {entreprise}, {point}, {jour})
-- ---------------------------------------------------------------------------
insert into email_templates (template_key, label, subject, body) values
  ('recue', 'Commande reçue',
   'Votre commande {numero} est bien enregistrée',
   E'Bonjour {client},\n\nNous vous confirmons la bonne réception de votre commande {numero}.\nNous la préparons et revenons vers vous dès qu''elle passe en fabrication.\n\nMerci de votre confiance,\n{entreprise}'),

  ('fabrication', 'En fabrication',
   'Votre commande {numero} est en fabrication',
   E'Bonjour {client},\n\nBonne nouvelle : votre commande {numero} est maintenant en fabrication dans notre atelier.\nNous vous préviendrons dès qu''elle sera prête.\n\nÀ bientôt,\n{entreprise}'),

  ('pret_retrait', 'Prêt — retrait',
   'Votre commande {numero} est prête à être retirée',
   E'Bonjour {client},\n\nVotre commande {numero} est prête. Vous pouvez venir la retirer : {point} {jour}.\nN''hésitez pas à nous contacter pour convenir d''un moment.\n\nÀ très bientôt,\n{entreprise}'),

  ('pret_livraison', 'Prêt — livraison',
   'Votre commande {numero} est prête, livraison à venir',
   E'Bonjour {client},\n\nVotre commande {numero} est prête. Nous vous contactons prochainement pour fixer la date de livraison.\n\nÀ très bientôt,\n{entreprise}'),

  ('termine', 'Livré / Finalisé',
   'Votre commande {numero} — merci !',
   E'Bonjour {client},\n\nVotre commande {numero} vous a bien été remise. Nous espérons qu''elle vous donnera entière satisfaction.\nUn grand merci pour votre confiance, et à bientôt chez {entreprise}.\n'),

  ('annule', 'Commande annulée',
   'Votre commande {numero} a été annulée',
   E'Bonjour {client},\n\nVotre commande {numero} a été annulée. Si vous avez déjà versé un acompte, il vous sera remboursé — nous vous recontactons à ce sujet.\nPour toute question, répondez simplement à cet email.\n\nCordialement,\n{entreprise}')
on conflict (template_key) do nothing;

-- ---------------------------------------------------------------------------
--  Produits — tissus au mètre (avec confection sur mesure)
-- ---------------------------------------------------------------------------
insert into products (name, sku, category_id, price, unit, stock, low_stock_at, confection_category, largeur_max)
select v.name, v.sku,
       (select id from product_categories where name = v.cat),
       v.price, v.unit::product_unit, v.stock, v.low, v.cc::confection_categ, v.lmax
from (values
  ('Voilage lin naturel',            'VOI-LIN-NAT', 'Voilage',  16.50, 'm', 42, 15, 'rideau_voilage', null),
  ('Rideau occultant gris ardoise',  'RID-OCC-GRI', 'Rideau',   34.00, 'm', 18, 10, 'rideau_voilage', null),
  ('Tenture velours bleu nuit',      'TEN-VEL-BLE', 'Tenture',  42.50, 'm',  9, 10, 'tenture',        null),
  ('Toile pour store beige sable',   'STO-TOI-BEI', 'Store',    28.00, 'm', 25, 10, 'rideau_voilage', 3.00)
) as v(name, sku, cat, price, unit, stock, low, cc, lmax);

-- ---------------------------------------------------------------------------
--  Produits — accessoires & ruflettes (prix simples, pas de confection)
--  max_qty_per_line : au-delà, ajouter une 2e ligne du même produit.
-- ---------------------------------------------------------------------------
insert into products (name, sku, category_id, price, unit, stock, low_stock_at, max_qty_per_line)
select v.name, v.sku,
       (select id from product_categories where name = v.cat),
       v.price, v.unit::product_unit, v.stock, v.low, v.maxq
from (values
  ('Rail aluminium ligne simple',        'ACC-RAIL-ALU', 'Accessoire', 10.00, 'm',          60, 12, 6.0),
  ('Crochets',                           'ACC-CROCHET',  'Accessoire',  3.50, 'paquet_100', 40,  8, null),
  ('Cavaliers (standard)',               'ACC-CAV-STD',  'Accessoire',  3.50, 'paquet_100', 40,  8, null),
  ('Ruflette froncé automatique 3cm',    'RUF-FRO-3',    'Ruflette',    1.00, 'm',         200, 40, null),
  ('Ruflette froncé automatique 8cm',    'RUF-FRO-8',    'Ruflette',    2.00, 'm',         200, 40, null),
  ('Ruflette plié sans fils 3cm',        'RUF-PLI-3',    'Ruflette',    1.00, 'm',         200, 40, null),
  ('Ruflette wave',                      'RUF-WAVE',     'Ruflette',    3.00, 'm',         150, 30, null),
  ('Cavalier pour Wave',                 'RUF-CAV-WAVE', 'Ruflette',    4.00, 'm',         150, 30, null)
) as v(name, sku, cat, price, unit, stock, low, maxq);
