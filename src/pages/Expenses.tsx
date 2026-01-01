// Expenses Page Component
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent} from '@/components/ui/card';
import { ExpenseList } from '@/components/ExpenseList';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { ImportTransactions } from '@/components/ImportTransactions';
import { useState } from 'react';

const Expenses = () => {
  const { user, loading: authLoading } = useAuth();
  const { expenses, categories, loading: expensesLoading, refetch: refetchExpenses } = useExpenses();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleExpenseAdded = () => {
    setShowAddExpense(false);
    // Use setTimeout to ensure the UI state is updated before refetch
    setTimeout(() => {
      refetchExpenses(); // Explicitly refetch expenses
    }, 100);
  };

  if (expensesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 p-6 md:ml-0 container mx-auto">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => `expenses-loading-skeleton-${i}`).map((key) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Expenses</h1>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <ImportTransactions
                  categories={categories}
                  onImportComplete={refetchExpenses}
                />
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
                      categories={categories.filter(cat => !cat.type || cat.type === 'expense' || cat.type === 'both')}
                      onSuccess={handleExpenseAdded}
                      onExpenseChange={refetchExpenses}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Expenses Content */}
            <ExpenseList
              expenses={expenses}
              categories={categories.filter(cat => !cat.type || cat.type === 'expense' || cat.type === 'both')}
              onExpenseChange={refetchExpenses}
            />
          </div>
    </div>
  );
};

export default Expenses;