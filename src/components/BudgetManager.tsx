import { useState } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { AddBudgetForm } from './AddBudgetForm';
import { formatCurrency } from '@/utils/dateUtils';

export const BudgetManager = () => {
  const { budgets, loading } = useBudgets();
  const { expenses } = useExpenses();
  const [showAddBudget, setShowAddBudget] = useState(false);

  // Calculate budget progress
  const getBudgetProgress = (budget: any) => {
    const now = new Date();
    const startDate = new Date(budget.start_date);
    const endDate = budget.end_date ? new Date(budget.end_date) : null;

    // Filter expenses for this budget period and category
    const relevantExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isInDateRange = expenseDate >= startDate && (!endDate || expenseDate <= endDate);
      const isInCategory = !budget.category_id || expense.category_id === budget.category_id;
      return isInDateRange && isInCategory;
    });

    const totalSpent = relevantExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const percentage = (totalSpent / budget.amount) * 100;

    return {
      totalSpent,
      percentage: Math.min(percentage, 100),
      isOverBudget: totalSpent > budget.amount,
      remaining: budget.amount - totalSpent,
    };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-muted-foreground">Track your spending against your budgets</p>
        </div>
        <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            <AddBudgetForm onSuccess={() => setShowAddBudget(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first budget to start tracking your spending goals
            </p>
            <Button onClick={() => setShowAddBudget(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {budgets.map((budget) => {
            const progress = getBudgetProgress(budget);
            
            return (
              <Card key={budget.id} className={progress.isOverBudget ? 'border-destructive' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {budget.name}
                        {progress.isOverBudget && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {budget.categories?.name || 'All categories'} • {budget.period}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatCurrency(budget.amount)}
                      </div>
                      <Badge variant={budget.is_active ? 'default' : 'secondary'}>
                        {budget.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Spent: {formatCurrency(progress.totalSpent)}</span>
                        <span className={progress.isOverBudget ? 'text-destructive' : 'text-muted-foreground'}>
                          {progress.isOverBudget ? 'Over budget' : `${formatCurrency(progress.remaining)} left`}
                        </span>
                      </div>
                      <Progress 
                        value={progress.percentage} 
                        className={progress.isOverBudget ? 'bg-destructive/20' : ''}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {progress.percentage.toFixed(1)}% of budget used
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Period: {new Date(budget.start_date).toLocaleDateString()} - 
                      {budget.end_date ? new Date(budget.end_date).toLocaleDateString() : 'Ongoing'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
