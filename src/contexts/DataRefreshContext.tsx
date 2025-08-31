import React, { createContext, useContext, useCallback } from 'react';

interface DataRefreshContextType {
  refreshAll: () => void;
  refreshBudgets: () => void;
  refreshIncome: () => void;
  refreshExpenses: () => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

interface DataRefreshProviderProps {
  children: React.ReactNode;
  budgetRefresh?: () => void;
  incomeRefresh?: () => void;
  expenseRefresh?: () => void;
}

export const DataRefreshProvider: React.FC<DataRefreshProviderProps> = ({
  children,
  budgetRefresh,
  incomeRefresh,
  expenseRefresh,
}) => {
  const refreshAll = useCallback(() => {
    // Trigger all refresh functions with small delays to prevent conflicts
    budgetRefresh?.();
    setTimeout(() => incomeRefresh?.(), 50);
    setTimeout(() => expenseRefresh?.(), 100);
  }, [budgetRefresh, incomeRefresh, expenseRefresh]);

  const refreshBudgets = useCallback(() => {
    budgetRefresh?.();
  }, [budgetRefresh]);

  const refreshIncome = useCallback(() => {
    incomeRefresh?.();
  }, [incomeRefresh]);

  const refreshExpenses = useCallback(() => {
    expenseRefresh?.();
  }, [expenseRefresh]);

  const value = {
    refreshAll,
    refreshBudgets,
    refreshIncome,
    refreshExpenses,
  };

  return (
    <DataRefreshContext.Provider value={value}>
      {children}
    </DataRefreshContext.Provider>
  );
};

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (context === undefined) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider');
  }
  return context;
};
