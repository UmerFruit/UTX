import { useMemo } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { formatCurrency } from '@/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Calendar } from 'lucide-react';

interface BudgetOverviewCardsProps {
  month: number;
  year: number;
}

export const BudgetOverviewCards = ({ month, year }: BudgetOverviewCardsProps) => {
  const {
    budgets,
    expenses,
    summary,
    isLoading: loading
  } = useBudgetData({ month, year });

  // Separate budgets by type
  const flexibleBudgets = budgets.filter(b => b.type === 'flexible');
  const plannedBudgets = budgets.filter(b => b.type === 'planned');

  // Calculate summary data for each budget type
  const budgetSummaries = useMemo(() => {
    const calculateSummary = (budgets: typeof flexibleBudgets, type: 'flexible' | 'planned') => {
      const totalAllocated = budgets.reduce((sum, budget) => sum + (budget.total_amount || 0), 0);

      // Get category IDs for this budget type
      const categoryIds = new Set(
        budgets.flatMap(b => 
          b.budget_categories.map(bc => bc.category_id)
        )
      );

      // Calculate actual spending for these categories
      const totalSpent = expenses
        .filter(exp => categoryIds.has(exp.category_id || ''))
        .reduce((sum, exp) => sum + exp.amount, 0);

      const totalRemaining = totalAllocated - totalSpent;

      return {
        totalAllocated,
        totalSpent,
        totalRemaining,
        count: budgets.length
      };
    };

    return {
      flexible: calculateSummary(flexibleBudgets, 'flexible'),
      planned: calculateSummary(plannedBudgets, 'planned')
    };
  }, [flexibleBudgets, plannedBudgets, expenses]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => `budget-loading-${i}`).map((key) => (
          <Card key={key} className="shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasBudgets = flexibleBudgets.length > 0 || plannedBudgets.length > 0;

  if (!hasBudgets) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Budgets Yet</h3>
          <p className="text-muted-foreground">
            Create your first budget to start tracking your spending goals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Flexible Budgets Card */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">Flexible Budgets</CardTitle>
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-3xl font-bold text-blue-600 mb-1">
            {formatCurrency(budgetSummaries.flexible.totalAllocated)}
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allocated:</span>
              <span className="font-medium">{formatCurrency(budgetSummaries.flexible.totalAllocated)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spent:</span>
              <span className="font-medium text-red-600">{formatCurrency(budgetSummaries.flexible.totalSpent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining:</span>
              <span className={`font-medium ${budgetSummaries.flexible.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(budgetSummaries.flexible.totalRemaining)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {budgetSummaries.flexible.count} budget{budgetSummaries.flexible.count === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>

      {/* Planned Budgets Card */}
      <Card className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">Planned Budgets</CardTitle>
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl sm:text-3xl font-bold text-green-600 mb-1">
            {formatCurrency(budgetSummaries.planned.totalAllocated)}
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allocated:</span>
              <span className="font-medium">{formatCurrency(budgetSummaries.planned.totalAllocated)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spent:</span>
              <span className="font-medium text-red-600">{formatCurrency(budgetSummaries.planned.totalSpent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining:</span>
              <span className={`font-medium ${budgetSummaries.planned.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(budgetSummaries.planned.totalRemaining)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {budgetSummaries.planned.count} budget{budgetSummaries.planned.count === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};