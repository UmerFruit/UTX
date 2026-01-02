// Main dashboard component for UTX
import { useState, useMemo } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncome } from '@/hooks/useIncome';
import { getCurrentMonthRange, isExpenseInRange, formatCurrency } from '@/utils/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { ExpenseList } from './ExpenseList';
import { AddExpenseForm } from './AddExpenseForm';
import { AddIncomeForm } from './AddIncomeForm';
import { ExpenseChart } from './ExpenseChart';
import { LoansSummary } from './LoansSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const Dashboard = () => {
  const { expenses, categories, loading } = useExpenses();
  const { income } = useIncome();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  const handleExpenseAdded = () => {
    setShowAddExpense(false);
  };

  const handleIncomeAdded = () => {
    setShowAddIncome(false);
  };

  // Calculate statistics with memoization for better performance
  const { monthlyExpenses, monthlyTotal, recentExpenses, monthlyIncome, netMonthlyFlow } = useMemo(() => {
    const monthRange = getCurrentMonthRange();

    const monthlyExpenses = expenses.filter(expense => 
      isExpenseInRange(expense.date, monthRange.start, monthRange.end)
    );

    // Calculate income for the same periods
    const monthlyIncome = income.filter(item => {
      return isExpenseInRange(item.date, monthRange.start, monthRange.end);
    }).reduce((sum, item) => sum + item.amount, 0);

    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate net cash flow
    const netMonthlyFlow = monthlyIncome - monthlyTotal;

    // Get recent expenses (last 5)
    const recentExpenses = expenses.slice(0, 5);

    return {
      monthlyExpenses,
      monthlyTotal,
      recentExpenses,
      monthlyIncome,
      netMonthlyFlow
    };
  }, [expenses, income]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => `loading-skeleton-${i}`).map((key) => (
            <Card key={key}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:gap-8 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-12">
          <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
            <DialogTrigger asChild>
              <Card className="xs:col-span-2 lg:col-span-1 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Monthly Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xl sm:text-3xl font-bold text-red-600">{formatCurrency(monthlyTotal)}</div>
                    <Plus className="h-5 w-5 text-red-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {monthlyExpenses.length} expense{monthlyExpenses.length === 1 ? '' : 's'}
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <AddExpenseForm 
                onSuccess={handleExpenseAdded}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showAddIncome} onOpenChange={setShowAddIncome}>
            <DialogTrigger asChild>
              <Card className="xs:col-span-2 lg:col-span-1 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Monthly Income</CardTitle>
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xl sm:text-3xl font-bold text-green-600">{formatCurrency(monthlyIncome)}</div>
                    <Plus className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Income</DialogTitle>
              </DialogHeader>
              <AddIncomeForm 
                onSuccess={handleIncomeAdded}
              />
            </DialogContent>
          </Dialog>

          <Card className={`xs:col-span-2 lg:col-span-1 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 ${netMonthlyFlow >= 0 ? 'border-l-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20' : 'border-l-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">Net Cash Flow</CardTitle>
              <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${netMonthlyFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-xl sm:text-3xl font-bold mb-1 ${netMonthlyFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netMonthlyFlow >= 0 ? '+' : ''}{formatCurrency(netMonthlyFlow)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6 sm:space-y-8">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold">Recent Expenses</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Your latest expenses</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ExpenseList
                    expenses={recentExpenses}
                    categories={categories}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-center">Spending by Category</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ExpenseChart expenses={monthlyExpenses} categories={categories} />
                </CardContent>
              </Card>
              
              {/* Loans Summary Widget */}
              <LoansSummary />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};