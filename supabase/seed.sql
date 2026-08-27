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
-- ---------------------------------------------------------------------------
insert into product_categories (name, position) values
  ('Voilage',    10),
  ('Rideau',     20),
  ('Tenture',    30),
  ('Store',      40),
  ('Accessoire', 50)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
--  Types de confection (modifiables par l'admin)
--  m = largeur × facteur + marge_fixe
--  prix = (prix_tissu_au_metre + frais_selon_categorie) × m
-- ---------------------------------------------------------------------------
insert into confection_types (nom, facteur, marge_fixe, frais_rideau_voilage, frais_tenture, position) values
  ('Froncé',   2.0, 0.20,   4,   5, 10),
  ('Plié',     3.0, 0.20,   4,   5, 20),
  ('Wave 6cm', 2.8, 0.20,  10,  10, 30),
  ('Wave 8cm', 2.2, 0.20,  10,  10, 40),
  ('Store',    1.0, 0.20, 120, 120, 50);

-- ---------------------------------------------------------------------------
--  Services facturables (modifiables par l'admin)
-- ---------------------------------------------------------------------------
insert into services (name, price, position) values
  ('Prise de mesure',   30, 10),
  ('Livraison',         25, 20),
  ('Pose à domicile',   60, 30);

-- ---------------------------------------------------------------------------
--  Modèles d'emails (variables disponibles : {client}, {numero}, {entreprise})
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
   E'Bonjour {client},\n\nVotre commande {numero} est prête. Vous pouvez venir la retirer à la boutique ou sur le marché.\nN''hésitez pas à nous contacter pour convenir d''un moment.\n\nÀ très bientôt,\n{entreprise}'),

  ('pret_livraison', 'Prêt — livraison',
   'Votre commande {numero} est prête, livraison à venir',
   E'Bonjour {client},\n\nVotre commande {numero} est prête. Nous vous contactons prochainement pour fixer la date de livraison.\n\nÀ très bientôt,\n{entreprise}'),

  ('termine', 'Livré / Finalisé',
   'Votre commande {numero} — merci !',
   E'Bonjour {client},\n\nVotre commande {numero} vous a bien été remise. Nous espérons qu''elle vous donnera entière satisfaction.\nUn grand merci pour votre confiance, et à bientôt chez {entreprise}.\n')
on conflict (template_key) do nothing;

-- ---------------------------------------------------------------------------
--  Exemple de produits (à adapter / supprimer)
-- ---------------------------------------------------------------------------
insert into products (name, sku, category_id, price, unit, stock, low_stock_at, confection_category)
select v.name, v.sku,
       (select id from product_categories where name = v.cat),
       v.price, v.unit::product_unit, v.stock, v.low, v.cc::confection_categ
from (values
  ('Voilage lin naturel',            'VOI-LIN-NAT', 'Voilage',    16.50, 'm',     42, 15, 'rideau_voilage'),
  ('Rideau occultant gris ardoise',  'RID-OCC-GRI', 'Rideau',     34.00, 'm',     18, 10, 'rideau_voilage'),
  ('Tenture velours bleu nuit',      'TEN-VEL-BLE', 'Tenture',    42.50, 'm',      9, 10, 'tenture'),
  ('Toile pour store beige sable',   'STO-TOI-BEI', 'Store',      28.00, 'm',     25, 10, 'rideau_voilage'),
  ('Tringle laiton extensible',      'ACC-TRI-LAI', 'Accessoire', 22.00, 'piece', 14,  6, null)
) as v(name, sku, cat, price, unit, stock, low, cc);
