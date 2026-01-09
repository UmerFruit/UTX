// filepath: src/integrations/supabase/budgets.ts
import { supabase } from './client';
import type { 
  Budget, 
  BudgetWithCategories, 
  BudgetCategory,
  CreateBudgetFormData
} from '@/types/budget';

export const budgetService = {
  /**
   * Fetch all budgets for a specific month with populated categories
   * @param month - Month number (1-12)
   * @param year - Year (e.g., 2024)
   * @returns Array of budgets with their categories
   */
  async getBudgetsForMonth(month: number, year: number): Promise<BudgetWithCategories[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_categories (
          *,
          category:categories (
            id,
            name,
            user_id,
            created_at
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('type', { ascending: true }); // flexible first, then planned

    if (error) throw error;

    // Calculate total_amount for each budget
    const budgetsWithTotals = (data || []).map(budget => ({
      ...budget,
      total_amount: budget.budget_categories.reduce(
        (sum: number, bc: any) => sum + Number(bc.amount), 
        0
      )
    }));

    return budgetsWithTotals as BudgetWithCategories[];
  },

  /**
   * Create a new budget with categories
   * @param data - Budget creation data
   * @returns Created budget with categories
   */
  async createBudget(data: CreateBudgetFormData): Promise<BudgetWithCategories> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Step 1: Create the budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        name: data.name,
        type: data.type,
        month: data.month,
        year: data.year
      })
      .select()
      .single();

    if (budgetError) throw budgetError;

    // Step 2: Add categories to budget
    if (data.categories.length > 0) {
      const { error: categoriesError } = await supabase
        .from('budget_categories')
        .insert(
          data.categories.map(cat => ({
            budget_id: budget.id,
            category_id: cat.category_id,
            amount: cat.amount
          }))
        );

      if (categoriesError) throw categoriesError;
    }

    // Step 3: Fetch and return the complete budget
    return await budgetService.getBudgetById(budget.id);
  },

  /**
   * Get a single budget by ID with categories
   */
  async getBudgetById(budgetId: string): Promise<BudgetWithCategories> {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_categories (
          *,
          category:categories (
            id,
            name,
            user_id,
            created_at
          )
        )
      `)
      .eq('id', budgetId)
      .single();

    if (error) throw error;

    return {
      ...data,
      total_amount: data.budget_categories.reduce(
        (sum: number, bc: any) => sum + Number(bc.amount), 
        0
      )
    } as BudgetWithCategories;
  },

  /**
   * Update budget name
   */
  async updateBudgetName(budgetId: string, newName: string): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .update({ name: newName })
      .eq('id', budgetId)
      .select()
      .single();

    if (error) throw error;
    return data as Budget;
  },

  /**
   * Add a category to a budget or update existing
   */
  async upsertBudgetCategory(
    budgetId: string, 
    categoryId: string, 
    amount: number
  ): Promise<BudgetCategory> {
    const { data, error } = await supabase
      .from('budget_categories')
      .upsert({
        budget_id: budgetId,
        category_id: categoryId,
        amount: amount
      }, {
        onConflict: 'budget_id,category_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove a category from a budget
   */
  async removeCategoryFromBudget(budgetId: string, categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('budget_id', budgetId)
      .eq('category_id', categoryId);

    if (error) throw error;
  },

  /**
   * Delete a budget (categories cascade automatically)
   */
  async deleteBudget(budgetId: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId);

    if (error) throw error;
  },

  /**
   * Check if a category is already in a budget for given month/year
   * This helps prevent the unique constraint violation
   */
  async isCategoryInUse(
    categoryId: string, 
    month: number, 
    year: number,
    excludeBudgetId?: string
  ): Promise<{ inUse: boolean; budgetName?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('budget_categories')
      .select(`
        budget_id,
        budgets!inner (
          id,
          name,
          user_id
        )
      `)
      .eq('category_id', categoryId)
      .eq('budget_month', month)
      .eq('budget_year', year)
      .eq('budget_user_id', user.id);

    if (error) throw error;

    if (data && data.length > 0) {
      // Filter out the current budget if editing
      const filtered = excludeBudgetId 
        ? data.filter((bc: any) => bc.budgets.id !== excludeBudgetId)
        : data;

      if (filtered.length > 0) {
        return {
          inUse: true,
          budgetName: (filtered[0] as any).budgets.name
        };
      }
    }

    return { inUse: false };
  },

  /**
   * Get all available categories for a month (not already in any budget)
   */
  async getAvailableCategories(month: number, year: number, excludeBudgetId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get all user categories
    const { data: allCategories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (catError) throw catError;

    // Get categories already in budgets for this month
    const { data: usedCategories, error: usedError } = await supabase
      .from('budget_categories')
      .select('category_id, budgets!inner(id)')
      .eq('budget_month', month)
      .eq('budget_year', year)
      .eq('budget_user_id', user.id);

    if (usedError) throw usedError;

    // Filter out used categories (except from current budget if editing)
    const usedCategoryIds = new Set(
      (usedCategories || [])
        .filter((bc: any) => !excludeBudgetId || bc.budgets.id !== excludeBudgetId)
        .map((bc: any) => bc.category_id)
    );

    return (allCategories || []).filter(cat => !usedCategoryIds.has(cat.id));
  }
};