// Expenses management hook for UTX
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string;
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
  created_at: string;
}

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch expenses with category information
  const fetchExpenses = async () => {
    if (!user) return;
    
    setLoading(true);
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
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  // Fetch categories
  const fetchCategories = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  // Add new expense
  const addExpense = async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        ...expense,
        user_id: user.id,
      }])
      .select();

    if (!error && data) {
      fetchExpenses(); // Refresh the list
    }
    
    return { data, error };
  };

  // Update expense
  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select();

    if (!error) {
      fetchExpenses(); // Refresh the list
    }
    
    return { data, error };
  };

  // Delete expense
  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchExpenses(); // Refresh the list
    }
    
    return { error };
  };

  // Add new category
  const addCategory = async (category: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        ...category,
        user_id: user.id,
      }])
      .select();

    if (!error && data) {
      fetchCategories(); // Refresh the list
    }
    
    return { data, error };
  };

  // Update category
  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();

    if (!error) {
      fetchCategories(); // Refresh the list
      fetchExpenses(); // Refresh expenses to show updated category names
    }
    
    return { data, error };
  };

  // Delete category
  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchCategories(); // Refresh the list
      fetchExpenses(); // Refresh expenses
    }
    
    return { error };
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchCategories();
    } else {
      setExpenses([]);
      setCategories([]);
      setLoading(false);
    }
  }, [user]);

  return {
    expenses,
    categories,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: () => {
      fetchExpenses();
      fetchCategories();
    }
  };
}