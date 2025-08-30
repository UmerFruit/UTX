// Main dashboard component for UTX
import { useState, useMemo } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrency, getCurrentWeekRange, getCurrentMonthRange, isExpenseInRange } from '@/utils/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { ExpenseList } from './ExpenseList';
import { AddExpenseForm } from './AddExpenseForm';
import { ExpenseChart } from './ExpenseChart';
import { CategoryManager } from './CategoryManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV } from '@/utils/exportUtils';

export const Dashboard = () => {
  const { expenses, categories, loading, refetch } = useExpenses();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Calculate statistics with memoization for better performance
  const { weeklyExpenses, monthlyExpenses, weeklyTotal, monthlyTotal, totalExpenses, recentExpenses } = useMemo(() => {
    const weekRange = getCurrentWeekRange();
    const monthRange = getCurrentMonthRange();

    const weeklyExpenses = expenses.filter(expense => 
      isExpenseInRange(expense.date, weekRange.start, weekRange.end)
    );
    
    const monthlyExpenses = expenses.filter(expense => 
      isExpenseInRange(expense.date, monthRange.start, monthRange.end)
    );

    const weeklyTotal = weeklyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get recent expenses (last 5)
    const recentExpenses = expenses.slice(0, 5);

    return {
      weeklyExpenses,
      monthlyExpenses,
      weeklyTotal,
      monthlyTotal,
      totalExpenses,
      recentExpenses
    };
  }, [expenses]);

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Track your expenses and manage your budget</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCategories} onOpenChange={(open) => {
            setShowCategories(open);
            if (!open) {
              // Refresh data when dialog closes
              refetch();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <CategoryManager 
                categories={categories} 
                onCategoryChange={refetch}
              />
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          
          <Dialog open={showAddExpense} onOpenChange={(open) => {
            setShowAddExpense(open);
            if (!open) {
              // Refresh data when dialog closes
              refetch();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <AddExpenseForm 
                categories={categories} 
                onSuccess={() => {
                  setShowAddExpense(false);
                }}
                onExpenseChange={refetch}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weeklyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {weeklyExpenses.length} expense{weeklyExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyExpenses.length} expense{monthlyExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} total expense{expenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Active categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="recent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recent">Recent Expenses</TabsTrigger>
              <TabsTrigger value="all">All Expenses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Your latest 5 expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseList 
                    expenses={recentExpenses} 
                    categories={categories}
                    onExpenseChange={refetch}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Expenses</CardTitle>
                  <CardDescription>Complete list of your expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseList 
                    expenses={expenses} 
                    categories={categories}
                    onExpenseChange={refetch}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Visual breakdown of your expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseChart expenses={monthlyExpenses} categories={categories} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};