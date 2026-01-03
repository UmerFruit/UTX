// Income Page Component
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIncome } from '@/hooks/useIncome';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { IncomeManager } from '@/components/IncomeManager';
import { Loader2 } from 'lucide-react';

const Income = () => {
  const { user, loading } = useAuth();
  const { income } = useIncome();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            </div>

            {/* Income Content */}
            <IncomeManager income={income} />
          </div>
    </div>
  );
};

export default Income;