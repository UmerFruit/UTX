 // Date utility functions for UTX
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const formatDate = (date: string | Date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatCurrency = (amount: number) => {
  const formatter = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `Rs${formatter.format(Math.abs(amount))}`;
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