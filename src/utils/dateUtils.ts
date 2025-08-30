// Date utility functions for UTX
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const formatDate = (date: string | Date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const getCurrentWeekRange = () => {
  const now = new Date();
  return {
    start: startOfWeek(now),
    end: endOfWeek(now),
  };
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

export const isExpenseInRange = (expenseDate: string, start: Date, end: Date) => {
  return isWithinInterval(new Date(expenseDate), { start, end });
};