import { useMemo } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { formatCurrency } from '@/utils/dateUtils';
import { Card, CardContent } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

type AllowanceStatus = 'under' | 'near' | 'over';

interface DailyAllowance {
  date: Date;
  spent: number;
  available: number;
  status: AllowanceStatus;
}

interface AllowanceCalendarProps {
  month: number;
  year: number;
}

export const AllowanceCalendar = ({ month, year }: AllowanceCalendarProps) => {
  const { budgets, expenses, isLoading: loading } = useBudgetData({ month, year });

  // Separate budgets by type
  const flexibleBudgets = budgets.filter(b => b.type === 'flexible');
  const plannedBudgets = budgets.filter(b => b.type === 'planned');

  const calendarData = useMemo(() => {
    const allBudgets = [...flexibleBudgets, ...plannedBudgets];
    if (loading || !allBudgets.length) {
      return {
        days: [],
        currentMonth: new Date(year, month - 1),
      };
    }

    const currentMonth = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const daysInMonth = eachDayOfInterval({ start: currentMonth, end: monthEnd });

    // Get flexible budget category IDs for spending calculations
    const flexibleCategoryIds = new Set(
      flexibleBudgets.flatMap(b => 
        b.budget_categories.map(bc => bc.category_id)
      )
    );

    // Calculate daily allowance from flexible budgets
    const totalFlexibleBudget = flexibleBudgets.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    const dailyAllowances: DailyAllowance[] = daysInMonth.map((day, index) => {
      const dayNumber = index + 1;

      // Calculate spending for this specific day
      const spentToday = expenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getDate() === dayNumber &&
                 expDate.getMonth() === month - 1 &&
                 expDate.getFullYear() === year &&
                 flexibleCategoryIds.has(exp.category_id || '');
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      // Calculate total spent up to (but not including) this day
      let totalSpentBeforeToday = 0;
      
      for (let d = 1; d < dayNumber; d++) {
        const daySpent = expenses
          .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getDate() === d &&
                   expDate.getMonth() === month - 1 &&
                   expDate.getFullYear() === year &&
                   flexibleCategoryIds.has(exp.category_id || '');
          })
          .reduce((sum, exp) => sum + exp.amount, 0);
        
        totalSpentBeforeToday += daySpent;
      }

      // Calculate remaining days in month (including current day)
      const remainingDays = daysInMonth.length - dayNumber + 1;
      
      // Calculate remaining budget after all previous spending
      const remainingBudget = totalFlexibleBudget - totalSpentBeforeToday;
      
      // Available per remaining day (including today)
      const availablePerDay = remainingDays > 0 ? remainingBudget / remainingDays : 0;
      
      // Available today before spending
      const availableToday = Math.max(0, availablePerDay);
      const remainingAfterSpent = availableToday - spentToday;

      let status: AllowanceStatus = 'under';
      if (remainingAfterSpent < 0) {
        status = 'over';
      } else if (spentToday >= availablePerDay * 0.8) {
        status = 'near';
      }

      return {
        date: day,
        spent: spentToday,
        available: Math.max(0, remainingAfterSpent),
        status,
      };
    });

    return {
      days: dailyAllowances,
      currentMonth,
    };
  }, [flexibleBudgets, plannedBudgets, expenses, loading, month, year]);

  const getStatusColor = (status: AllowanceStatus) => {
    switch (status) {
      case 'under':
        return 'border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900';
      case 'near':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950 dark:hover:bg-yellow-900';
      case 'over':
        return 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Daily Allowance</h3>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'MMMM yyyy')}</p>
        </div>

        {/* Skeleton loader */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {Array.from({ length: 5 }, (_, i) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-20"></div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!calendarData.days.length) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Daily Allowance</h3>
        <p className="text-muted-foreground">
          No budget data available for this month.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Daily Allowance</h3>
        <p className="text-sm text-muted-foreground">{format(calendarData.currentMonth, 'MMMM yyyy')}</p>
      </div>

      {/* Scrollable list of day cards */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 themed-scrollbar">
        {calendarData.days.map((dayData) => {
          const isCurrentDay = isToday(dayData.date);
          const isPastDay = dayData.date < new Date() && !isCurrentDay;

          return (
            <Card
              key={format(dayData.date, 'yyyy-MM-dd')}
              className={cn(
                'transition-all duration-200 cursor-pointer',
                getStatusColor(dayData.status),
                isCurrentDay && 'ring-2 ring-primary ring-offset-2',
                isPastDay && 'opacity-75'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className={cn(
                      'text-base font-semibold',
                      isCurrentDay && 'text-primary'
                    )}>
                      {format(dayData.date, 'EEE, MMM d')}
                      {isCurrentDay && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Today</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(dayData.date, 'yyyy')}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs text-muted-foreground">Spent</div>
                    <div className="text-sm font-semibold text-red-600">
                      {formatCurrency(dayData.spent)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Available</div>
                    <div className={cn(
                      'text-sm font-semibold',
                      dayData.status === 'under' && 'text-green-600',
                      dayData.status === 'near' && 'text-yellow-600',
                      dayData.status === 'over' && 'text-red-600'
                    )}>
                      {formatCurrency(dayData.available)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-green-200 bg-green-50"></div>
          <span>Under budget</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-yellow-200 bg-yellow-50"></div>
          <span>Near limit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-red-200 bg-red-50"></div>
          <span>Over budget</span>
        </div>
      </div>
    </div>
  );
};
