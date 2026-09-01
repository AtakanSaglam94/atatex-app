import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Expense, ExpenseCategory } from '@/types';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<number>();

  const reload = useCallback(async () => {
    const [{ data: exp }, { data: cats }] = await Promise.all([
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('position').order('name'),
    ]);
    setExpenses((exp as Expense[]) ?? []);
    setCategories((cats as ExpenseCategory[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel('atatex-expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(reload, 250);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => {
        window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(reload, 250);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { expenses, categories, loading, reload };
}
