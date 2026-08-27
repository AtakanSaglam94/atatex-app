// Types métier — reflètent le schéma Supabase (supabase/migrations/0001_init.sql)

export type UserRole = 'admin' | 'travailleur';
export type ProductUnit = 'm' | 'piece' | 'kit';
export type ConfectionCategory = 'rideau_voilage' | 'tenture';
export type OrderStatus = 'recue' | 'fabrication' | 'pret' | 'termine';
export type OrderFulfillment = 'retrait' | 'livraison';
export type DiscountKind = 'none' | 'montant' | 'pourcent';
export type OrderItemKind = 'produit' | 'service' | 'libre';

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
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface ConfectionType {
  id: string;
  nom: string;
  facteur: number;
  marge_fixe: number;
  frais_rideau_voilage: number;
  frais_tenture: number;
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
  unit: ProductUnit;
  stock: number;
  low_stock_at: number;
  confection_category: ConfectionCategory | null;
  photo_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vat: string;
  notes: string;
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
  facteur: number | null;
  marge_fixe: number | null;
  frais_confection: number | null;
  metrage: number | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  order_date: string;
  status: OrderStatus;
  fulfillment: OrderFulfillment;
  discount_type: DiscountKind;
  discount_value: number;
  round_total: boolean;
  deposit_amount: number;
  notes: string;
  invoice_number: string | null;
  invoiced_at: string | null;
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
  | 'termine';

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
