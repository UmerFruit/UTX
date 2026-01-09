import { useMemo, useState } from 'react';
import { useIncome } from '@/hooks/useIncome';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrency } from '@/utils/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  DollarSign,
  Repeat,
  TrendingDown,
  Target,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts';

interface IncomeSourceData {
  category: string;
  totalAmount: number;
  count: number;
  isRecurring: boolean;
  averageAmount: number;
  lastReceived: string;
  color: string;
}

interface ExpenseCategoryData {
  category: string;
  totalAmount: number;
  count: number;
  averageAmount: number;
  lastExpense: string;
  color: string;
}

// Color palette for charts
const CHART_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
];

const INCOME_COLORS = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
const EXPENSE_COLORS = ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'];

/* eslint-disable @typescript-eslint/no-explicit-any */
// Custom tooltip components for charts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload?.length) {
    const data = payload[0];
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">{data.name}</p>
        <p className="text-sm">{formatCurrency(data.value)}</p>
      </div>
    );
  }
  return null;
};

const DailyTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm">Day {label}</p>
        <p className="text-sm text-red-600">
          {formatCurrency(payload[0].value as number)}
        </p>
      </div>
    );
  }
  return null;
};

const LegendFormatter = (value: string) => <span className="text-sm">{value}</span>;

// Custom hooks
const useMonthSelector = (income: any[], expenses: any[]) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const dateRange = useMemo(() => {
    const allDates: Date[] = [];
    income.forEach(item => allDates.push(new Date(item.date)));
    expenses.forEach(item => allDates.push(new Date(item.date)));

    if (allDates.length === 0) {
      const now = new Date();
      return {
        earliest: { year: now.getFullYear(), month: now.getMonth() },
        latest: { year: now.getFullYear(), month: now.getMonth() }
      };
    }

    const sortedDates = [...allDates].sort((a, b) => a.getTime() - b.getTime());
    const earliest = sortedDates[0];
    const now = new Date();

    return {
      earliest: { year: earliest.getFullYear(), month: earliest.getMonth() },
      latest: { year: now.getFullYear(), month: now.getMonth() }
    };
  }, [income, expenses]);

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

const useIncomeAnalysis = (income: any[], selectedDate: { year: number; month: number }) => {
  const selectedMonthIncome = useMemo(() => {
    return income.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === selectedDate.year &&
             itemDate.getMonth() === selectedDate.month;
    });
  }, [income, selectedDate]);

  const analysis = useMemo(() => {
    const categoryMap = new Map<string, IncomeSourceData>();

    selectedMonthIncome.forEach((item, index) => {
      const categoryName = item.categories?.name || 'Uncategorized';
      const categoryColor = item.categories?.color || INCOME_COLORS[index % INCOME_COLORS.length];
      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.totalAmount += item.amount;
        existing.count += 1;
        existing.averageAmount = existing.totalAmount / existing.count;
        if (new Date(item.date) > new Date(existing.lastReceived)) {
          existing.lastReceived = item.date;
        }
      } else {
        categoryMap.set(categoryName, {
          category: categoryName,
          totalAmount: item.amount,
          count: 1,
          isRecurring: item.is_recurring,
          averageAmount: item.amount,
          lastReceived: item.date,
          color: categoryColor,
        });
      }
    });

    const sources = Array.from(categoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedDate.year, selectedDate.month - i, 1);
      const monthIncome = income.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getFullYear() === date.getFullYear() &&
               itemDate.getMonth() === date.getMonth();
      });

      last6Months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        fullMonth: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: monthIncome.reduce((sum, item) => sum + item.amount, 0),
        count: monthIncome.length,
      });
    }

    const recurringIncome = selectedMonthIncome.filter(item => item.is_recurring);
    const oneTimeIncome = selectedMonthIncome.filter(item => !item.is_recurring);

    const totalRecurring = recurringIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalOneTime = oneTimeIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = totalRecurring + totalOneTime;

    const compositionData = [
      { name: 'Recurring', value: totalRecurring, color: '#10B981' },
      { name: 'One-time', value: totalOneTime, color: '#3B82F6' },
    ].filter(item => item.value > 0);

    return {
      sources,
      last6Months,
      recurringStats: {
        total: totalRecurring,
        count: recurringIncome.length,
        percentage: totalIncome > 0 ? (totalRecurring / totalIncome) * 100 : 0,
      },
      oneTimeStats: {
        total: totalOneTime,
        count: oneTimeIncome.length,
        percentage: totalIncome > 0 ? (totalOneTime / totalIncome) * 100 : 0,
      },
      totalIncome,
      compositionData,
    };
  }, [income, selectedMonthIncome, selectedDate]);

  return { selectedMonthIncome, ...analysis };
};

const useExpenseAnalysis = (expenses: any[], selectedDate: { year: number; month: number }) => {
  const selectedMonthExpenses = useMemo(() => {
    return expenses.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === selectedDate.year &&
             itemDate.getMonth() === selectedDate.month;
    });
  }, [expenses, selectedDate]);

  const analysis = useMemo(() => {
    const categoryMap = new Map<string, ExpenseCategoryData>();

    selectedMonthExpenses.forEach((item, index) => {
      const categoryName = item.categories?.name || 'Uncategorized';
      const categoryColor = item.categories?.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length];
      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.totalAmount += item.amount;
        existing.count += 1;
        existing.averageAmount = existing.totalAmount / existing.count;
        if (new Date(item.date) > new Date(existing.lastExpense)) {
          existing.lastExpense = item.date;
        }
      } else {
        categoryMap.set(categoryName, {
          category: categoryName,
          totalAmount: item.amount,
          count: 1,
          averageAmount: item.amount,
          lastExpense: item.date,
          color: categoryColor,
        });
      }
    });

    const categories = Array.from(categoryMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedDate.year, selectedDate.month - i, 1);
      const monthExpenses = expenses.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getFullYear() === date.getFullYear() &&
               itemDate.getMonth() === date.getMonth();
      });

      last6Months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        fullMonth: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: monthExpenses.reduce((sum, item) => sum + item.amount, 0),
        count: monthExpenses.length,
      });
    }

    const totalExpenses = selectedMonthExpenses.reduce((sum, item) => sum + item.amount, 0);
    const averageExpense = selectedMonthExpenses.length > 0 ? totalExpenses / selectedMonthExpenses.length : 0;

    const dailySpending = new Map<number, number>();
    selectedMonthExpenses.forEach(item => {
      const day = new Date(item.date).getDate();
      dailySpending.set(day, (dailySpending.get(day) || 0) + item.amount);
    });

    const dailyData = Array.from({ length: new Date(selectedDate.year, selectedDate.month + 1, 0).getDate() }, (_, i) => ({
      day: i + 1,
      amount: dailySpending.get(i + 1) || 0,
    }));

    return {
      categories,
      last6Months,
      totalExpenses,
      averageExpense,
      transactionCount: selectedMonthExpenses.length,
      dailyData,
    };
  }, [expenses, selectedMonthExpenses, selectedDate]);

  return { selectedMonthExpenses, ...analysis };
};

// Sub-components
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

const OverviewCards = ({
  selectedMonthTotalIncome,
  selectedMonthIncome,
  selectedMonthTotalExpenses,
  selectedMonthExpenses,
  netIncome,
  incomeChange,
  expenseChange,
  previousMonthData
}: {
  selectedMonthTotalIncome: number;
  selectedMonthIncome: any[];
  selectedMonthTotalExpenses: number;
  selectedMonthExpenses: any[];
  netIncome: number;
  incomeChange: number;
  expenseChange: number;
  previousMonthData: { totalIncome: number; totalExpenses: number };
}) => (
  <div className="grid gap-4 md:grid-cols-4">
    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
        <TrendingUp className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(selectedMonthTotalIncome)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {incomeChange !== 0 && previousMonthData.totalIncome > 0 && (
            <Badge variant={incomeChange >= 0 ? "default" : "destructive"} className="text-xs">
              {incomeChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(incomeChange).toFixed(1)}%
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {selectedMonthIncome.length} transaction{selectedMonthIncome.length === 1 ? '' : 's'}
          </span>
        </div>
      </CardContent>
    </Card>

    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
        <TrendingDown className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-red-600">
          {formatCurrency(selectedMonthTotalExpenses)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {expenseChange !== 0 && previousMonthData.totalExpenses > 0 && (
            <Badge variant={expenseChange <= 0 ? "default" : "destructive"} className="text-xs">
              {expenseChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(expenseChange).toFixed(1)}%
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {selectedMonthExpenses.length} transaction{selectedMonthExpenses.length === 1 ? '' : 's'}
          </span>
        </div>
      </CardContent>
    </Card>

    <Card className={`hover:shadow-md transition-all duration-200 border-l-4 ${netIncome >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Net Income</CardTitle>
        <DollarSign className={`h-4 w-4 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {netIncome < 0 ? '-' : ''}{formatCurrency(Math.abs(netIncome))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {netIncome >= 0 ? 'Surplus' : 'Deficit'} this month
        </p>
      </CardContent>
    </Card>

    <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
        <Target className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-blue-600">
          {selectedMonthTotalIncome > 0 ? ((netIncome / selectedMonthTotalIncome) * 100).toFixed(1) : 0}%
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedMonthTotalIncome > 0 && netIncome > 0
            ? `${formatCurrency(netIncome)} saved`
            : 'Of income saved'}
        </p>
      </CardContent>
    </Card>
  </div>
);

const TrendChart = ({ combinedTrendData }: { combinedTrendData: any[] }) => (
  <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        6-Month Financial Overview
      </CardTitle>
      <CardDescription>Track your income, expenses, and net savings over time</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis
              className="text-xs"
              tickFormatter={(value) => `Rs${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              fill="#10B981"
              fillOpacity={0.2}
              stroke="#10B981"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              fill="#EF4444"
              fillOpacity={0.2}
              stroke="#EF4444"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#3B82F6', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

const IncomeTab = ({ incomeAnalysis, selectedMonthIncome }: { incomeAnalysis: any; selectedMonthIncome: any[] }) => {
  const incomePieData = incomeAnalysis.sources.map((source: any, index: number) => ({
    name: source.category,
    value: source.totalAmount,
    color: source.color || INCOME_COLORS[index % INCOME_COLORS.length],
  }));

  return (
    <TabsContent value="income" className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
            <CardDescription>Distribution of income sources</CardDescription>
          </CardHeader>
          <CardContent>
            {incomePieData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {incomePieData.map((entry: any, index: number) => (
                        <Cell key={`income-cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend formatter={LegendFormatter} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No income data for this month
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle>Income Composition</CardTitle>
            <CardDescription>Recurring vs One-time income</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeAnalysis.compositionData.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeAnalysis.compositionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {incomeAnalysis.compositionData.map((entry: any) => (
                          <Cell key={`composition-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Repeat className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Recurring</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(incomeAnalysis.recurringStats.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {incomeAnalysis.recurringStats.percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">One-time</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(incomeAnalysis.oneTimeStats.total)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {incomeAnalysis.oneTimeStats.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No income data for this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle>Income Trend</CardTitle>
          <CardDescription>Monthly income over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeAnalysis.last6Months}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="fullMonth" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `Rs${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Income"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle>All Income Sources</CardTitle>
          <CardDescription>Complete breakdown of income by category</CardDescription>
        </CardHeader>
        <CardContent>
          {incomeAnalysis.sources.length > 0 ? (
            <div className="space-y-3">
              {incomeAnalysis.sources.map((category: any, index: number) => (
                <div key={category.category} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color || INCOME_COLORS[index % INCOME_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{category.category}</span>
                      {category.isRecurring && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          <Repeat className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {category.count} transaction{category.count === 1 ? '' : 's'} • Avg: {formatCurrency(category.averageAmount)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(category.totalAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {incomeAnalysis.totalIncome > 0
                        ? ((category.totalAmount / incomeAnalysis.totalIncome) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No income recorded for this month
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

const ExpenseTab = ({ expenseAnalysis, selectedMonthExpenses }: { expenseAnalysis: any; selectedMonthExpenses: any[] }) => {
  const expensePieData = expenseAnalysis.categories.map((cat: any, index: number) => ({
    name: cat.category,
    value: cat.totalAmount,
    color: cat.color || CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <TabsContent value="expenses" className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            {expensePieData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expensePieData.map((entry: any, index: number) => (
                        <Cell key={`expense-cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend formatter={LegendFormatter} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No expense data for this month
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle>Daily Spending Pattern</CardTitle>
            <CardDescription>Your spending throughout the month</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseAnalysis.dailyData.some((d: any) => d.amount > 0) ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseAnalysis.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="day"
                      className="text-xs"
                      interval="preserveStartEnd"
                      tickFormatter={(day: number) => day % 5 === 0 || day === 1 ? day.toString() : ''}
                    />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(value: number) => `Rs${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<DailyTooltip />} />
                    <Bar
                      dataKey="amount"
                      fill="#EF4444"
                      radius={[2, 2, 0, 0]}
                      fillOpacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No spending data for this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle>Expense Trend</CardTitle>
          <CardDescription>Monthly expenses over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseAnalysis.last6Months}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="fullMonth" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value: number) => `Rs${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Expenses"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle>All Expense Categories</CardTitle>
          <CardDescription>Complete breakdown of spending by category</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseAnalysis.categories.length > 0 ? (
            <div className="space-y-3">
              {expenseAnalysis.categories.map((category: any, index: number) => {
                const percentage = expenseAnalysis.totalExpenses > 0
                  ? (category.totalAmount / expenseAnalysis.totalExpenses) * 100
                  : 0;
                return (
                  <div key={category.category} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color || CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{category.category}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {category.count} transaction{category.count === 1 ? '' : 's'} • Avg: {formatCurrency(category.averageAmount)}
                      </div>
                    </div>
                    <div className="flex-1 max-w-[200px] hidden sm:block">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: category.color || CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(category.totalAmount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No expenses recorded for this month
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Analysis</h1>
      <p className="text-sm sm:text-base text-muted-foreground">Detailed insights into your financial data</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => `analysis-loading-skeleton-${i}`).map((key, i) => {
        let borderClass: string;
        if (i === 0) {
          borderClass = 'border-l-green-500';
        } else if (i === 1) {
          borderClass = 'border-l-red-500';
        } else if (i === 2) {
          borderClass = 'border-l-green-500';
        } else {
          borderClass = 'border-l-blue-500';
        }
        return (
          <Card key={key} className={`hover:shadow-md transition-all duration-200 border-l-4 ${borderClass}`}>
            <CardHeader className="pb-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, i) => `analysis-chart-skeleton-${i}`).map((key) => (
        <Card key={key} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary">
          <CardHeader>
            <div className="animate-pulse space-y-2">
              <div className="h-5 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const AnalysisDashboard = () => {
  const { income, loading: incomeLoading } = useIncome();
  const { expenses, loading: expensesLoading } = useExpenses();

  const monthSelector = useMonthSelector(income, expenses);
  const incomeAnalysis = useIncomeAnalysis(income, monthSelector.selectedDate);
  const expenseAnalysis = useExpenseAnalysis(expenses, monthSelector.selectedDate);

  const previousMonthData = useMemo(() => {
    const prevMonth = monthSelector.selectedDate.month === 0 ? 11 : monthSelector.selectedDate.month - 1;
    const prevYear = monthSelector.selectedDate.month === 0 ? monthSelector.selectedDate.year - 1 : monthSelector.selectedDate.year;

    const prevIncome = income.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === prevYear && itemDate.getMonth() === prevMonth;
    });

    const prevExpenses = expenses.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === prevYear && itemDate.getMonth() === prevMonth;
    });

    return {
      totalIncome: prevIncome.reduce((sum, item) => sum + item.amount, 0),
      totalExpenses: prevExpenses.reduce((sum, item) => sum + item.amount, 0)
    };
  }, [income, expenses, monthSelector.selectedDate]);

  const combinedTrendData = useMemo(() => {
    return incomeAnalysis.last6Months.map((month, index) => ({
      name: month.fullMonth,
      income: month.total,
      expenses: expenseAnalysis.last6Months[index]?.total || 0,
      net: month.total - (expenseAnalysis.last6Months[index]?.total || 0),
    }));
  }, [incomeAnalysis.last6Months, expenseAnalysis.last6Months]);

  const selectedMonthTotalIncome = incomeAnalysis.totalIncome;
  const selectedMonthTotalExpenses = expenseAnalysis.totalExpenses;
  const netIncome = selectedMonthTotalIncome - selectedMonthTotalExpenses;

  const incomeChange = previousMonthData.totalIncome > 0
    ? ((selectedMonthTotalIncome - previousMonthData.totalIncome) / previousMonthData.totalIncome) * 100
    : 0;
  const expenseChange = previousMonthData.totalExpenses > 0
    ? ((selectedMonthTotalExpenses - previousMonthData.totalExpenses) / previousMonthData.totalExpenses) * 100
    : 0;

  if (incomeLoading || expensesLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financial Analysis</h1>
        </div>

        <MonthSelector {...monthSelector} />
      </div>

      <OverviewCards
        selectedMonthTotalIncome={selectedMonthTotalIncome}
        selectedMonthIncome={incomeAnalysis.selectedMonthIncome}
        selectedMonthTotalExpenses={selectedMonthTotalExpenses}
        selectedMonthExpenses={expenseAnalysis.selectedMonthExpenses}
        netIncome={netIncome}
        incomeChange={incomeChange}
        expenseChange={expenseChange}
        previousMonthData={previousMonthData}
      />

      <TrendChart combinedTrendData={combinedTrendData} />

      <Tabs defaultValue="income" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="income">Income Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Analysis</TabsTrigger>
        </TabsList>

        <IncomeTab incomeAnalysis={incomeAnalysis} selectedMonthIncome={incomeAnalysis.selectedMonthIncome} />
        <ExpenseTab expenseAnalysis={expenseAnalysis} selectedMonthExpenses={expenseAnalysis.selectedMonthExpenses} />
      </Tabs>
    </div>
  );
};  
