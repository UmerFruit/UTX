import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { BudgetOverviewCards } from '@/components/BudgetOverviewCards';
import { AllowanceCalendar } from '@/components/AllowanceCalendar';
import { BudgetManager } from '@/components/BudgetManager';
import { Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';

const MonthSelector = ({
  selectedMonthLabel,
  canGoPrevious,
  canGoNext,
  goToPreviousMonth,
  goToNextMonth,
  goToCurrentMonth,
  isCurrentMonth
}: {
  selectedMonthLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  isCurrentMonth: boolean;
}) => (
  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
    <Button
      variant="ghost"
      size="icon"
      onClick={goToPreviousMonth}
      disabled={!canGoPrevious}
      className="h-8 w-8"
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>

    <div className="flex items-center gap-2 px-3 min-w-[160px] justify-center">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium text-sm">{selectedMonthLabel}</span>
    </div>

    <Button
      variant="ghost"
      size="icon"
      onClick={goToNextMonth}
      disabled={!canGoNext}
      className="h-8 w-8"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>

    {!isCurrentMonth && (
      <Button
        variant="outline"
        size="sm"
        onClick={goToCurrentMonth}
        className="ml-2 text-xs"
      >
        Today
      </Button>
    )}
  </div>
);

// Custom hook for month selection (adapted from AnalysisDashboard)
const useMonthSelector = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // For budgets, we'll allow navigation to future months for planning
  const dateRange = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const sixMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 6, 1);

    return {
      earliest: { year: sixMonthsAgo.getFullYear(), month: sixMonthsAgo.getMonth() },
      latest: { year: sixMonthsFromNow.getFullYear(), month: sixMonthsFromNow.getMonth() }
    };
  }, []);

  const canGoPrevious = useMemo(() => {
    if (selectedDate.year > dateRange.earliest.year) return true;
    if (selectedDate.year === dateRange.earliest.year && selectedDate.month > dateRange.earliest.month) return true;
    return false;
  }, [selectedDate, dateRange]);

  const canGoNext = useMemo(() => {
    if (selectedDate.year < dateRange.latest.year) return true;
    if (selectedDate.year === dateRange.latest.year && selectedDate.month < dateRange.latest.month) return true;
    return false;
  }, [selectedDate, dateRange]);

  const goToPreviousMonth = () => {
    if (!canGoPrevious) return;
    setSelectedDate(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    setSelectedDate(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedDate({ year: now.getFullYear(), month: now.getMonth() });
  };

  const selectedMonthLabel = useMemo(() => {
    const date = new Date(selectedDate.year, selectedDate.month);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return selectedDate.year === now.getFullYear() && selectedDate.month === now.getMonth();
  }, [selectedDate]);

  return {
    selectedDate,
    dateRange,
    canGoPrevious,
    canGoNext,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    selectedMonthLabel,
    isCurrentMonth
  };
};

const Budgets = () => {
  const { user, loading: authLoading } = useAuth();
  const monthSelector = useMonthSelector();
  const { selectedDate } = monthSelector;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get budgets data for the selected month
  const { budgets = [] } = useBudgetData({ 
    month: selectedDate.month + 1, // Convert from 0-11 to 1-12
    year: selectedDate.year 
  });

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="container mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Budgets</h1>
            <p className="text-muted-foreground">Track your spending goals and financial planning</p>
          </div>
        </div>

        {/* Overview Cards */}
        <BudgetOverviewCards month={selectedDate.month + 1} year={selectedDate.year} />

        {/* Allowance Calendar with Month Selector */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Daily Allowance</h2>
            <MonthSelector {...monthSelector} />
          </div>
          <AllowanceCalendar month={selectedDate.month + 1} year={selectedDate.year} />
        </div>

        {/* Budget Management */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Manage Budgets</h2>
          <BudgetManager budgets={budgets} />
        </div>
      </div>
    </div>
  );
};

export default Budgets;