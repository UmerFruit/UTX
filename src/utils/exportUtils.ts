// Utility functions for exporting data
import { Expense } from '@/hooks/useExpenses';

export const exportToCSV = (expenses: Expense[], filename: string = 'expenses') => {
  // Create CSV headers
  const headers = ['Date', 'Amount', 'Category', 'Description'];
  
  // Create CSV rows
  const rows = expenses.map(expense => [
    expense.date,
    expense.amount.toString(),
    expense.categories?.name || 'Unknown',
    expense.description || ''
  ]);
  
  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};