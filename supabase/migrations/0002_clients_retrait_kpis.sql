-- ============================================================================
--  ATA-TEX — révision 0002
--  Clients structurés · points de retrait · hauteur confection · KPIs · services
-- ============================================================================
--  À exécuter dans Supabase → SQL Editor, une fois, APRÈS 0001_init.sql.
--  (Sans danger si relancé : gardes IF NOT EXISTS / WHERE NOT EXISTS.)
-- ============================================================================

-- ---------------------------------------------------------------------------
--  CLIENTS — données structurées (particulier / professionnel + adresse)
-- ---------------------------------------------------------------------------
alter table clients add column if not exists client_type text not null default 'particulier'
  check (client_type in ('particulier', 'professionnel'));
alter table clients add column if not exists first_name   text not null default '';
alter table clients add column if not exists last_name    text not null default '';
alter table clients add column if not exists company_name text not null default '';
alter table clients add column if not exists address_line text not null default '';
alter table clients add column if not exists postal_code  text not null default '';
alter table clients add column if not exists city         text not null default '';
alter table clients add column if not exists country      text not null default 'BE';

-- Reprise des données déjà saisies (le nom libre part dans "nom de famille")
update clients set last_name = name        where last_name = ''    and coalesce(name, '') <> '';
update clients set address_line = address   where address_line = '' and coalesce(address, '') <> '';
-- Les colonnes `name` et `address` sont conservées : l'application y réécrit
-- automatiquement le libellé complet (compatibilité affichage / factures).

-- ---------------------------------------------------------------------------
--  POINTS DE RETRAIT — gérables par l'admin
-- ---------------------------------------------------------------------------
create table if not exists pickup_points (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  day         text not null default '',      -- ex. "Dimanche"
  address     text not null default '',
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table pickup_points enable row level security;
drop policy if exists "pickup_points: lecture" on pickup_points;
drop policy if exists "pickup_points: admin" on pickup_points;
create policy "pickup_points: lecture" on pickup_points for select to authenticated using (true);
create policy "pickup_points: admin" on pickup_points for all to authenticated using (is_admin()) with check (is_admin());

insert into pickup_points (name, day, position)
select * from (values
  ('Dépôt Saint-Josse',        '',         10),
  ('Marché de l''Abattoir',    'Dimanche', 20),
  ('Marché de Châtelineau',    'Samedi',   30),
  ('Marché de Heusden-Zolder', 'Mercredi', 40)
) as v(name, day, position)
where not exists (select 1 from pickup_points);

-- ---------------------------------------------------------------------------
--  COMMANDES — point de retrait, virement bancaire, horodatage des statuts
-- ---------------------------------------------------------------------------
alter table orders add column if not exists pickup_point_id uuid references pickup_points (id) on delete set null;
alter table orders add column if not exists bank_transfer   boolean not null default false;
alter table orders add column if not exists fabrication_at  timestamptz;
alter table orders add column if not exists ready_at        timestamptz;
alter table orders add column if not exists completed_at    timestamptz;

create or replace function stamp_order_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'fabrication' and new.fabrication_at is null then new.fabrication_at := now(); end if;
    if new.status = 'pret'        and new.ready_at is null       then new.ready_at := now();       end if;
    if new.status = 'termine'     and new.completed_at is null   then new.completed_at := now();   end if;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_stamp_status on orders;
create trigger orders_stamp_status before update on orders
  for each row execute function stamp_order_status();

-- ---------------------------------------------------------------------------
--  LIGNES DE COMMANDE — hauteur souhaitée (donnée seule, aucun calcul)
-- ---------------------------------------------------------------------------
alter table order_items add column if not exists hauteur numeric(8, 3);

-- ---------------------------------------------------------------------------
--  PRODUITS — prix de revient (pour la marge sur le tableau de bord)
-- ---------------------------------------------------------------------------
alter table products add column if not exists cost_price numeric(10, 2) not null default 0 check (cost_price >= 0);

-- ---------------------------------------------------------------------------
--  SERVICES — Showroom à la maison (gratuit)
-- ---------------------------------------------------------------------------
insert into services (name, price, position)
select 'Showroom à la maison', 0, 45
where not exists (select 1 from services where name = 'Showroom à la maison');

-- ---------------------------------------------------------------------------
--  REALTIME
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table pickup_points;
exception when duplicate_object then null;
end $$;
