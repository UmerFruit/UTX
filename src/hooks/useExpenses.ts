// Expenses management hook for UTX
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  type?: string;
  created_at: string;
}

// Query key factory
const expensesKeys = {
  all: ['expenses'] as const,
  byUser: (userId: string) => ['expenses', userId] as const,
  categories: ['categories'] as const,
  categoriesByUser: (userId: string) => ['categories', userId] as const,
};

export function useExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch expenses with category information
  const {
    data: expenses = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: user ? expensesKeys.byUser(user.id) : expensesKeys.all,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          categories (
            id,
            name,
            color
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      return (data || []) as Expense[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Fetch categories (separate query for independent caching)
  const {
    data: categories = [],
  } = useQuery({
    queryKey: user ? expensesKeys.categoriesByUser(user.id) : expensesKeys.categories,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      return (data || []) as Category[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Add expense mutation with optimistic updates
  const addExpenseMutation = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categories'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          ...expense,
          user_id: user.id,
        }])
        .select(`
          *,
          categories (
            id,
            name,
            color
          )
        `)
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onMutate: async (newExpense) => {
      if (!user) return;

      const queryKey = expensesKeys.byUser(user.id);
      await queryClient.cancelQueries({ queryKey });

      const previousExpenses = queryClient.getQueryData<Expense[]>(queryKey);

      // Optimistically add the expense
      const optimisticExpense: Expense = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        amount: newExpense.amount,
        category_id: newExpense.category_id,
        date: newExpense.date,
        description: newExpense.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Expense[]>(queryKey, (old = []) => 
        [optimisticExpense, ...old]
      );

      return { previousExpenses, optimisticExpense };
    },
    onError: (err, newExpense, context) => {
      if (!user || !context) return;
      const queryKey = expensesKeys.byUser(user.id);
      queryClient.setQueryData(queryKey, context.previousExpenses);
      console.error('Failed to add expense:', err);
    },
    onSuccess: (data, variables, context) => {
      if (!user || !context) return;
      const queryKey = expensesKeys.byUser(user.id);
      
      queryClient.setQueryData<Expense[]>(queryKey, (old = []) => 
        old.map(exp => exp.id === context.optimisticExpense.id ? data : exp)
      );
    },
    onSettled: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: expensesKeys.byUser(user.id) });
      // Invalidate budget queries since expenses affect budget calculations
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          categories (
            id,
            name,
            color
          )
        `)
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onMutate: async ({ id, updates }) => {
      if (!user) return;

      const queryKey = expensesKeys.byUser(user.id);
      await queryClient.cancelQueries({ queryKey });

      const previousExpenses = queryClient.getQueryData<Expense[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<Expense[]>(queryKey, (old = []) =>
        old.map(exp => exp.id === id ? { ...exp, ...updates } : exp)
      );

      return { previousExpenses };
    },
    onError: (err, variables, context) => {
      if (!user || !context) return;
      const queryKey = expensesKeys.byUser(user.id);
      queryClient.setQueryData(queryKey, context.previousExpenses);
      console.error('Failed to update expense:', err);
    },
    onSuccess: (data) => {
      if (!user) return;
      const queryKey = expensesKeys.byUser(user.id);
      
      queryClient.setQueryData<Expense[]>(queryKey, (old = []) =>
        old.map(exp => exp.id === data.id ? data : exp)
      );
    },
    onSettled: () => {
      if (!user) return;
      // Invalidate budget queries since expenses affect budget calculations
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      if (!user) return;

      const queryKey = expensesKeys.byUser(user.id);
      await queryClient.cancelQueries({ queryKey });

      const previousExpenses = queryClient.getQueryData<Expense[]>(queryKey);

      // Optimistically remove
      queryClient.setQueryData<Expense[]>(queryKey, (old = []) =>
        old.filter(exp => exp.id !== id)
      );

      return { previousExpenses };
    },
    onError: (err, id, context) => {
      if (!user || !context) return;
      const queryKey = expensesKeys.byUser(user.id);
      queryClient.setQueryData(queryKey, context.previousExpenses);
      console.error('Failed to delete expense:', err);
    },
    onSettled: () => {
      if (!user) return;
      // Invalidate budget queries since expenses affect budget calculations
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  // Wrapper functions for backward compatibility
  const addExpense = async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categories'>) => {
    try {
      const data = await addExpenseMutation.mutateAsync(expense);
      return { data: [data], error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const data = await updateExpenseMutation.mutateAsync({ id, updates });
      return { data: [data], error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteExpenseMutation.mutateAsync(id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    expenses,
    categories,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch,
    // Expose mutations for advanced use cases
    addExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation,
  };
}
