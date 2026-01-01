// Income Page Component
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIncome } from '@/hooks/useIncome';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { IncomeManager } from '@/components/IncomeManager';
import { Button } from '@/components/ui/button';
import { Plus,Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddIncomeForm } from '@/components/AddIncomeForm';

const Income = () => {
  const { user, loading } = useAuth();
  const { income, refetch } = useIncome();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleIncomeAdded = () => {
    setShowAddIncome(false);
    // Use setTimeout to ensure the UI state is updated before refetch
    setTimeout(() => {
      refetch(); // Explicitly refetch income
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Income</h1>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Dialog open={showAddIncome} onOpenChange={(open) => {
                  setShowAddIncome(open);
                  if (!open) {
                    // Refresh data when dialog closes
                    refetch();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex-1 sm:flex-none">
                      <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Add Income</span>
                      <span className="xs:hidden">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Income</DialogTitle>
                    </DialogHeader>
                    <AddIncomeForm onSuccess={handleIncomeAdded} onIncomeChange={refetch} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Income Content */}
            <IncomeManager income={income} onIncomeChange={refetch} />
          </div>
    </div>
  );
};

export default Income;