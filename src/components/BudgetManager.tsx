import { useState } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useExpenses } from '@/hooks/useExpenses';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, TrendingUp, AlertTriangle, MoreHorizontal, Trash2 } from 'lucide-react';
import { AddBudgetForm } from './AddBudgetForm';
import { useToast } from '@/hooks/use-toast';

export const BudgetManager = () => {
  const { budgets, loading, refetch, deleteBudget } = useBudgets();
  const { expenses } = useExpenses();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<any>(null);

  const handleBudgetCreated = () => {
    setShowAddBudget(false);
    // Use setTimeout to ensure the UI state is updated before refetch
    setTimeout(() => {
      refetch(); // Explicitly refetch budgets
    }, 100);
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;

    const { error } = await deleteBudget(deletingBudget.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    }
    
    setDeletingBudget(null);
  };

  // Calculate budget progress
  const getBudgetProgress = (budget: any) => {
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Budget Management</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track your spending against your budgets</p>
        </div>
        <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            <AddBudgetForm onSuccess={handleBudgetCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <TrendingUp className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4">
              Create your first budget to start tracking your spending goals
            </p>
            <Button onClick={() => setShowAddBudget(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {budgets.map((budget) => {
            const progress = getBudgetProgress(budget);
            
            return (
              <Card key={budget.id} className={progress.isOverBudget ? 'border-destructive' : ''}>
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <span className="truncate">{budget.name}</span>
                        {progress.isOverBudget && (
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {budget.categories?.name || 'All categories'} • {budget.period}
                      </CardDescription>
                    </div>
                    <div className="flex items-start gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-bold">
                          {formatCurrency(budget.amount)}
                        </div>
                        <Badge variant={budget.is_active ? 'default' : 'secondary'} className="text-xs">
                          {budget.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setDeletingBudget(budget)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm mb-2">
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

      {/* Delete Budget Confirmation */}
      <AlertDialog open={!!deletingBudget} onOpenChange={() => setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBudget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
