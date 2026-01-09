// filepath: src/utils/budgetCalculator.ts
import { 
  getDaysInMonth, 
  parseISO,
  getDate
} from 'date-fns';
import type { BudgetWithCategories, DailyBudgetData, BudgetSummary } from '@/types/budget';
import type { Expense } from '@/hooks/useExpenses';

export const budgetCalculator = {
  /**
   * Calculate daily allowance from flexible budgets
   * Daily allowance = Total flexible budget / Days in month
   */
  calculateDailyAllowance(
    flexibleBudgets: BudgetWithCategories[],
    month: number,
    year: number
  ): number {
    const totalFlexible = flexibleBudgets.reduce(
      (sum, budget) => sum + (budget.total_amount || 0),
      0
    );

    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    return daysInMonth > 0 ? totalFlexible / daysInMonth : 0;
  },

  /**
   * Calculate spending for a specific day
   */
  getDaySpending(
    expenses: Expense[],
    day: number,
    month: number,
    year: number
  ): number {
    return expenses
      .filter(exp => {
        const expDate = parseISO(exp.date);
        return (
          getDate(expDate) === day &&
          expDate.getMonth() === month - 1 &&
          expDate.getFullYear() === year
        );
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  },

  /**
   * Calculate accumulated amount (rolling balance)
   * Accumulated = Sum of (Daily Allowance - Daily Spent) for each past day
   * Positive = user is under budget (savings)
   * Negative = user is over budget (debt)
   */
  calculateAccumulated(
    expenses: Expense[],
    dailyAllowance: number,
    currentDay: number,
    month: number,
    year: number
  ): number {
    let accumulated = 0;

    for (let day = 1; day < currentDay; day++) {
      const daySpent = this.getDaySpending(expenses, day, month, year);
      accumulated += dailyAllowance - daySpent;
    }

    return accumulated;
  },

  /**
   * Calculate available amount for today
   * Available = Daily Allowance + Accumulated
   */
  calculateAvailableToday(dailyAllowance: number, accumulated: number): number {
    return dailyAllowance + accumulated;
  },

  /**
   * Get spending status for a day
   */
  getSpendingStatus(spent: number, allowance: number): 'good' | 'warning' | 'over' {
    const percentage = allowance > 0 ? (spent / allowance) * 100 : 0;

    if (percentage > 100) return 'over';
    if (percentage >= 90) return 'warning';
    return 'good';
  },

  /**
   * Get daily data for last N days
   */
  getLastNDaysData(
    expenses: Expense[],
    dailyAllowance: number,
    currentDay: number,
    month: number,
    year: number,
    n: number = 7
  ): DailyBudgetData[] {
    const startDay = Math.max(1, currentDay - n + 1);
    const data: DailyBudgetData[] = [];
    
    let runningAccumulated = this.calculateAccumulated(
      expenses,
      dailyAllowance,
      startDay,
      month,
      year
    );

    for (let day = startDay; day <= currentDay; day++) {
      const spent = this.getDaySpending(expenses, day, month, year);
      const status = this.getSpendingStatus(spent, dailyAllowance);
      
      // Update accumulated for this day
      if (day < currentDay) {
        runningAccumulated += dailyAllowance - spent;
      }

      data.push({
        day,
        date: new Date(year, month - 1, day).toISOString(),
        spent,
        allowance: dailyAllowance,
        accumulated: runningAccumulated,
        status
      });
    }

    return data;
  },

  /**
   * Calculate complete budget summary
   */
  calculateBudgetSummary(
    budgets: BudgetWithCategories[],
    expenses: Expense[],
    month: number,
    year: number
  ): BudgetSummary {
    // Separate flexible and planned budgets
    const flexibleBudgets = budgets.filter(b => b.type === 'flexible');
    const plannedBudgets = budgets.filter(b => b.type === 'planned');

    // Calculate flexible budget data
    const flexibleTotal = flexibleBudgets.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0
    );

    // Get flexible category IDs
    const flexibleCategoryIds = new Set(
      flexibleBudgets.flatMap(b => 
        b.budget_categories.map(bc => bc.category_id)
      )
    );

    // Calculate flexible spending (only from flexible categories)
    const flexibleSpent = expenses
      .filter(exp => flexibleCategoryIds.has(exp.category_id || ''))
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate planned budget data
    const plannedTotal = plannedBudgets.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0
    );

    const plannedCategoryIds = new Set(
      plannedBudgets.flatMap(b => 
        b.budget_categories.map(bc => bc.category_id)
      )
    );

    const plannedUsed = expenses
      .filter(exp => plannedCategoryIds.has(exp.category_id || ''))
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Time calculations
    const now = new Date();
    const currentDay = now.getDate();
    const totalDays = getDaysInMonth(new Date(year, month - 1));
    const daysLeft = totalDays - currentDay;

    // Rolling budget calculations
    const dailyAllowance = this.calculateDailyAllowance(flexibleBudgets, month, year);
    const accumulated = this.calculateAccumulated(
      expenses,
      dailyAllowance,
      currentDay,
      month,
      year
    );
    const availableToday = this.calculateAvailableToday(dailyAllowance, accumulated);

    // Historical data
    const weeklyData = this.getLastNDaysData(
      expenses,
      dailyAllowance,
      currentDay,
      month,
      year,
      7
    );

    return {
      dailyAllowance,
      availableToday,
      accumulated,
      flexibleTotal,
      flexibleSpent,
      plannedTotal,
      plannedUsed,
      currentDay,
      daysLeft,
      totalDays,
      weeklyData,
      isOverBudget: availableToday < 0,
      hasDebt: accumulated < 0
    };
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'PKR'): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
};