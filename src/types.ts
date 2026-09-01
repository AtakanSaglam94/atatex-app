// Types métier — reflètent le schéma Supabase (supabase/migrations/0001_init.sql)

export type UserRole = 'admin' | 'travailleur';
export type ProductUnit = 'm' | 'piece' | 'paquet_100' | 'kit';
export type ConfectionCategory = 'rideau_voilage' | 'tenture';
export type OrderStatus = 'recue' | 'fabrication' | 'pret' | 'termine' | 'annule';
export type OrderFulfillment = 'retrait' | 'livraison';
export type DiscountKind = 'none' | 'montant' | 'pourcent';
export type OrderItemKind = 'produit' | 'service' | 'libre';
export type ClientType = 'particulier' | 'professionnel';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Company {
  id: 1;
  name: string;
  legal_form: string;
  vat: string;
  address: string;
  iban: string;
  email: string;
  phone: string;
  vat_rate: number;
  invoice_terms: string;
  google_review_url: string;
  website_url: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  position: number;
  /** surcharge de la largeur maxi du type de confection pour cette catégorie (m) */
  largeur_max: number | null;
  created_at: string;
}

export interface ConfectionType {
  id: string;
  nom: string;
  facteur: number;
  marge_fixe: number;
  frais_rideau_voilage: number;
  frais_tenture: number;
  largeur_min: number | null;
  largeur_max: number | null;
  active: boolean;
  position: number;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  active: boolean;
  position: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  price: number;
  cost_price: number;
  unit: ProductUnit;
  stock: number;
  low_stock_at: number;
  max_qty_per_line: number | null;
  largeur_min: number | null;
  largeur_max: number | null;
  hauteur_min: number | null;
  hauteur_max: number | null;
  confection_category: ConfectionCategory | null;
  barcode: string;
  photo_url: string;
  photo_urls: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  /** libellé complet calculé (compat affichage / factures) */
  name: string;
  client_type: ClientType;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  /** adresse libre (compat) — l'app la garde synchro avec les champs structurés */
  address: string;
  address_line: string;
  postal_code: string;
  city: string;
  country: string;
  vat: string;
  notes: string;
  created_at: string;
}

export interface PickupPoint {
  id: string;
  name: string;
  day: string;
  address: string;
  position: number;
  active: boolean;
  created_at: string;
}

export interface StockRoll {
  id: string;
  product_id: string;
  label: string;
  length_initial: number;
  manual_adjustment: number;
  location: string;
  barcode: string;
  received_at: string | null;
  notes: string;
  active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  position: number;
  kind: OrderItemKind;
  label: string;
  unit: ProductUnit | null;
  qty: number;
  unit_price: number;
  line_total: number;
  product_id: string | null;
  service_id: string | null;
  is_confection: boolean;
  confection_type_id: string | null;
  confection_type_label: string;
  confection_category: ConfectionCategory | null;
  largeur: number | null;
  hauteur: number | null;
  facteur: number | null;
  marge_fixe: number | null;
  frais_confection: number | null;
  metrage: number | null;
  roll_id: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  order_date: string;
  status: OrderStatus;
  is_quote: boolean;
  quote_valid_until: string | null;
  fulfillment: OrderFulfillment;
  pickup_point_id: string | null;
  bank_transfer: boolean;
  discount_type: DiscountKind;
  discount_value: number;
  round_total: boolean;
  deposit_amount: number;
  notes: string;
  invoice_number: string | null;
  invoiced_at: string | null;
  fabrication_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithRelations extends Order {
  client: Client | null;
  items: OrderItem[];
}

export type EmailTemplateKey =
  | 'recue'
  | 'fabrication'
  | 'pret_retrait'
  | 'pret_livraison'
  | 'termine'
  | 'annule';

export interface EmailTemplate {
  template_key: EmailTemplateKey;
  label: string;
  subject: string;
  body: string;
  enabled: boolean;
  updated_at: string;
}

export interface EmailLogEntry {
  id: string;
  order_id: string | null;
  template_key: string;
  to_email: string;
  status: 'pending' | 'sent' | 'error';
  error: string | null;
  created_at: string;
}

export type AppointmentKind = 'mesure' | 'pose' | 'livraison' | 'rdv' | 'autre';

export interface Appointment {
  id: string;
  kind: AppointmentKind;
  title: string;
  starts_at: string;
  duration_min: number;
  client_id: string | null;
  order_id: string | null;
  location: string;
  notes: string;
  done: boolean;
  created_by: string | null;
  created_at: string;
}

export type ExpensePayment = 'especes' | 'bancontact' | 'virement' | 'carte' | 'autre';

export interface ExpenseCategory {
  id: string;
  name: string;
  position: number;
  vat_deductible_pct: number;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  supplier: string;
  category_id: string | null;
  description: string;
  amount_ttc: number;
  vat_rate: number;
  vat_deductible_pct: number;
  payment_method: ExpensePayment;
  receipt_url: string;
  notes: string;
  created_by: string | null;
  created_at: string;
}
