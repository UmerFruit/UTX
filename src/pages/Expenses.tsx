// Expenses Page Component
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent} from '@/components/ui/card';
import { ExpenseList } from '@/components/ExpenseList';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const Expenses = () => {
  const { user, loading: authLoading } = useAuth();
  const { expenses, categories, loading: expensesLoading } = useExpenses();
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
            </div>

            {/* Expenses Content */}
            <ExpenseList
              expenses={expenses}
              categories={categories.filter(cat => !cat.type || cat.type === 'expense' || cat.type === 'both')}
            />
          </div>
    </div>
  );
};

export default Expenses;