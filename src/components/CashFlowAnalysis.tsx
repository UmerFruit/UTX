import { useMemo } from 'react';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency, getCurrentMonthRange, isExpenseInRange } from '@/utils/dateUtils';

export const CashFlowAnalysis = () => {
  const { income } = useIncome();
  const { expenses } = useExpenses();

  const cashFlowData = useMemo(() => {
    const monthRange = getCurrentMonthRange();
    
    // Current month income
    const monthlyIncome = income.filter(item => {
      const itemDate = new Date(item.date);
      return isExpenseInRange(item.date, monthRange.start, monthRange.end);
    }).reduce((sum, item) => sum + item.amount, 0);

    // Current month expenses
    const monthlyExpenses = expenses.filter(expense => 
      isExpenseInRange(expense.date, monthRange.start, monthRange.end)
    ).reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate net cash flow
    const netCashFlow = monthlyIncome - monthlyExpenses;
    const isPositive = netCashFlow > 0;

    // Calculate savings rate
    const savingsRate = monthlyIncome > 0 ? (netCashFlow / monthlyIncome) * 100 : 0;

    // Calculate expense ratio
    const expenseRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

    // Total income and expenses (all time)
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalNetWorth = totalIncome - totalExpenses;

    return {
      monthlyIncome,
      monthlyExpenses,
      netCashFlow,
      isPositive,
      savingsRate,
      expenseRatio,
      totalIncome,
      totalExpenses,
      totalNetWorth,
    };
  }, [income, expenses]);

  const getCashFlowStatus = () => {
    if (cashFlowData.netCashFlow > 0) {
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        status: 'Positive Cash Flow',
        description: 'Your income exceeds your expenses',
      };
    } else if (cashFlowData.netCashFlow < 0) {
      return {
        icon: TrendingDown,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        status: 'Negative Cash Flow',
        description: 'Your expenses exceed your income',
      };
    } else {
      return {
        icon: DollarSign,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        status: 'Break Even',
        description: 'Your income equals your expenses',
      };
    }
  };

  const flowStatus = getCashFlowStatus();
  const StatusIcon = flowStatus.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cash Flow Analysis</h2>
        <p className="text-muted-foreground">Track your income vs expenses and financial health</p>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cashFlowData.monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(cashFlowData.monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <StatusIcon className={`h-4 w-4 ${flowStatus.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${flowStatus.color}`}>
              {cashFlowData.isPositive ? '+' : ''}{formatCurrency(cashFlowData.netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cashFlowData.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Of monthly income</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Status Card */}
      <Card className={flowStatus.bgColor}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${flowStatus.color}`} />
            <CardTitle className={flowStatus.color}>{flowStatus.status}</CardTitle>
          </div>
          <CardDescription>{flowStatus.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Expense Ratio</span>
                <span>{cashFlowData.expenseRatio.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(cashFlowData.expenseRatio, 100)} 
                className={cashFlowData.expenseRatio > 100 ? 'bg-red-100' : ''}
              />
              {cashFlowData.expenseRatio > 100 && (
                <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Spending exceeds income
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Financial Health */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Financial Health</CardTitle>
          <CardDescription>Your complete financial picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(cashFlowData.totalIncome)}
              </div>
              <p className="text-sm text-muted-foreground">Total Income</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(cashFlowData.totalExpenses)}
              </div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold ${cashFlowData.totalNetWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {cashFlowData.totalNetWorth >= 0 ? '+' : ''}{formatCurrency(cashFlowData.totalNetWorth)}
              </div>
              <p className="text-sm text-muted-foreground">Net Worth</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
