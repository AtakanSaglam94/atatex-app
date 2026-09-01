import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Client,
  Company,
  ConfectionType,
  EmailTemplate,
  PickupPoint,
  Product,
  ProductCategory,
  Service,
  StockRoll,
} from '@/types';

interface DataState {
  loading: boolean;
  company: Company | null;
  categories: ProductCategory[];
  confectionTypes: ConfectionType[];
  services: Service[];
  products: Product[];
  clients: Client[];
  pickupPoints: PickupPoint[];
  stockRolls: StockRoll[];
  emailTemplates: EmailTemplate[];
  reload: () => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

const TABLES = [
  'company',
  'product_categories',
  'confection_types',
  'services',
  'products',
  'clients',
  'pickup_points',
  'stock_rolls',
  'email_templates',
] as const;

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [confectionTypes, setConfectionTypes] = useState<ConfectionType[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [stockRolls, setStockRolls] = useState<StockRoll[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const debounce = useRef<Record<string, number>>({});

  const reloadTable = useCallback(async (table: string) => {
    switch (table) {
      case 'company': {
        const { data } = await supabase.from('company').select('*').eq('id', 1).maybeSingle();
        setCompany((data as Company) ?? null);
        break;
      }
      case 'product_categories': {
        const { data } = await supabase
          .from('product_categories')
          .select('*')
          .order('position')
          .order('name');
        setCategories((data as ProductCategory[]) ?? []);
        break;
      }
      case 'confection_types': {
        const { data } = await supabase
          .from('confection_types')
          .select('*')
          .order('position')
          .order('nom');
        setConfectionTypes((data as ConfectionType[]) ?? []);
        break;
      }
      case 'services': {
        const { data } = await supabase.from('services').select('*').order('position').order('name');
        setServices((data as Service[]) ?? []);
        break;
      }
      case 'products': {
        const { data } = await supabase.from('products').select('*').order('name');
        setProducts((data as Product[]) ?? []);
        break;
      }
      case 'clients': {
        const { data } = await supabase.from('clients').select('*').order('name');
        setClients((data as Client[]) ?? []);
        break;
      }
      case 'pickup_points': {
        const { data } = await supabase
          .from('pickup_points')
          .select('*')
          .order('position')
          .order('name');
        setPickupPoints((data as PickupPoint[]) ?? []);
        break;
      }
      case 'stock_rolls': {
        const { data } = await supabase
          .from('stock_rolls')
          .select('*')
          .order('created_at');
        setStockRolls((data as StockRoll[]) ?? []);
        break;
      }
      case 'email_templates': {
        const { data } = await supabase.from('email_templates').select('*').order('template_key');
        setEmailTemplates((data as EmailTemplate[]) ?? []);
        break;
      }
    }
  }, []);

  const reload = useCallback(async () => {
    await Promise.all(TABLES.map((t) => reloadTable(t)));
  }, [reloadTable]);

  useEffect(() => {
    reload().finally(() => setLoading(false));

    const channel = supabase.channel('atatex-data');
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        // regroupe les rafales de changements
        window.clearTimeout(debounce.current[table]);
        debounce.current[table] = window.setTimeout(() => reloadTable(table), 250);
      });
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, reloadTable]);

  const value = useMemo<DataState>(
    () => ({
      loading,
      company,
      categories,
      confectionTypes,
      services,
      products,
      clients,
      pickupPoints,
      stockRolls,
      emailTemplates,
      reload,
    }),
    [
      loading,
      company,
      categories,
      confectionTypes,
      services,
      products,
      clients,
      pickupPoints,
      stockRolls,
      emailTemplates,
      reload,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData doit être utilisé dans <DataProvider>');
  return ctx;
}

export function useProductName(products: Product[]) {
  return useCallback(
    (id: string | null) => products.find((p) => p.id === id)?.name ?? 'Produit supprimé',
    [products],
  );
}
