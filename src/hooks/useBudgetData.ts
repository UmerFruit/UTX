// filepath: src/hooks/useBudgetData.ts
import { useQuery } from '@tanstack/react-query';
import { budgetService } from '@/integrations/supabase/budgets';
import { budgetCalculator } from '@/utils/budgetCalculator';
import { useExpenses } from './useExpenses';
import type { BudgetSummary } from '@/types/budget';

interface UseBudgetDataOptions {
  month: number;
  year: number;
}

export const useBudgetData = ({ month, year }: UseBudgetDataOptions) => {
  // Fetch budgets for the month
  const {
    data: budgets = [],
    isLoading: isBudgetsLoading,
    error: budgetsError,
    refetch: refetchBudgets
  } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => budgetService.getBudgetsForMonth(month, year),
    staleTime: 30000, // 30 seconds
  });

  // Fetch expenses for the month
  const {
    expenses: allExpenses = [],
    loading: isExpensesLoading,
    refetch: refetchExpenses
  } = useExpenses();

  // Filter expenses to only include those in the current month
  const expenses = allExpenses.filter(exp => {
    const expDate = new Date(exp.date);
    const expMonth = expDate.getMonth() + 1;
    const expYear = expDate.getFullYear();
    return expMonth === month && expYear === year;
  });

  // Calculate budget summary
  const summary: BudgetSummary | null = (budgets.length > 0 || expenses.length > 0)
    ? budgetCalculator.calculateBudgetSummary(budgets, expenses, month, year)
    : null;

  return {
    budgets,
    expenses,
    summary,
    isLoading: isBudgetsLoading || isExpensesLoading,
    error: budgetsError,
    refetch: () => {
      refetchBudgets();
      refetchExpenses();
    }
  };
};