// Main dashboard component for UTX
import { useState, useMemo } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import { useIncome } from '@/hooks/useIncome';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCurrentWeekRange, getCurrentMonthRange, isExpenseInRange } from '@/utils/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, Calendar, Download, DollarSign, Target, BarChart3 } from 'lucide-react';
import { ExpenseList } from './ExpenseList';
import { AddExpenseForm } from './AddExpenseForm';
import { ExpenseChart } from './ExpenseChart';
import { CategoryManager } from './CategoryManager';
import { BudgetManager } from './BudgetManager';
import { IncomeManager } from './IncomeManager';
import { CashFlowAnalysis } from './CashFlowAnalysis';
import { MonthlyBreakdown } from './MonthlyBreakdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV } from '@/utils/exportUtils';

export const Dashboard = () => {
  const { expenses, categories, loading, refetch: refetchExpenses } = useExpenses();
  const { income, refetch: refetchIncome } = useIncome();
  const { formatCurrency } = useCurrency();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const handleExpenseAdded = () => {
    setShowAddExpense(false);
    // Use setTimeout to ensure the UI state is updated before refetch
    setTimeout(() => {
      refetchExpenses(); // Explicitly refetch expenses
    }, 100);
  };

  // Calculate statistics with memoization for better performance
  const { weeklyExpenses, monthlyExpenses, weeklyTotal, monthlyTotal, totalExpenses, recentExpenses, monthlyIncome, weeklyIncome, netMonthlyFlow } = useMemo(() => {
    const weekRange = getCurrentWeekRange();
    const monthRange = getCurrentMonthRange();

    const weeklyExpenses = expenses.filter(expense => 
      isExpenseInRange(expense.date, weekRange.start, weekRange.end)
    );
    
    const monthlyExpenses = expenses.filter(expense => 
      isExpenseInRange(expense.date, monthRange.start, monthRange.end)
    );

    // Calculate income for the same periods
    const weeklyIncome = income.filter(item => {
      const itemDate = new Date(item.date);
      return isExpenseInRange(item.date, weekRange.start, weekRange.end);
    }).reduce((sum, item) => sum + item.amount, 0);

    const monthlyIncome = income.filter(item => {
      const itemDate = new Date(item.date);
      return isExpenseInRange(item.date, monthRange.start, monthRange.end);
    }).reduce((sum, item) => sum + item.amount, 0);

    const weeklyTotal = weeklyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate net cash flow
    const netMonthlyFlow = monthlyIncome - monthlyTotal;

    // Get recent expenses (last 5)
    const recentExpenses = expenses.slice(0, 5);

    return {
      weeklyExpenses,
      monthlyExpenses,
      weeklyTotal,
      monthlyTotal,
      totalExpenses,
      recentExpenses,
      monthlyIncome,
      weeklyIncome,
      netMonthlyFlow
    };
  }, [expenses, income]);

  const handleExportCSV = () => {
    exportToCSV(expenses, 'utx-expenses');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
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
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your expenses and manage your budget</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Dialog open={showCategories} onOpenChange={(open) => {
            setShowCategories(open);
            if (!open) {
              // Refresh data when dialog closes
              refetchExpenses();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Categories</span>
                <span className="xs:hidden">Cat.</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <CategoryManager 
                categories={categories} 
                onCategoryChange={refetchExpenses}
              />
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-none">
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Export CSV</span>
            <span className="xs:hidden">Export</span>
          </Button>
          
          <Dialog open={showAddExpense} onOpenChange={(open) => {
            setShowAddExpense(open);
            if (!open) {
              // Refresh data when dialog closes
              refetchExpenses();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-none">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Add Expense</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <AddExpenseForm 
                categories={categories} 
                onSuccess={handleExpenseAdded}
                onExpenseChange={refetchExpenses}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-5">
        <Card className="xs:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(monthlyIncome)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="xs:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(monthlyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyExpenses.length} expense{monthlyExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="xs:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Cash Flow</CardTitle>
            <DollarSign className={`h-3 w-3 sm:h-4 sm:w-4 ${netMonthlyFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold ${netMonthlyFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netMonthlyFlow >= 0 ? '+' : ''}{formatCurrency(netMonthlyFlow)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(weeklyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {weeklyExpenses.length} expense{weeklyExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Categories</CardTitle>
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 min-w-max sm:min-w-0">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="income" className="text-xs sm:text-sm">Income</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs sm:text-sm">Budgets</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs sm:text-sm">Cash Flow</TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs sm:text-sm">Monthly</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Recent Expenses</CardTitle>
                  <CardDescription>Your latest expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseList 
                    expenses={recentExpenses} 
                    categories={categories}
                    onExpenseChange={refetchExpenses}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Spending by Category</CardTitle>
                  <CardDescription>This month's breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseChart expenses={monthlyExpenses} categories={categories} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">All Expenses</CardTitle>
              <CardDescription>Complete list of your expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseList 
                expenses={expenses} 
                categories={categories}
                onExpenseChange={refetchExpenses}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <IncomeManager />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <BudgetManager />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowAnalysis />
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <MonthlyBreakdown />
        </TabsContent>
      </Tabs>
    </div>
  );
};