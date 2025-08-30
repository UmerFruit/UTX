// Expense chart component for UTX - Simple bar chart visualization
import { Expense, Category } from '@/hooks/useExpenses';
import { formatCurrency } from '@/utils/dateUtils';

interface ExpenseChartProps {
  expenses: Expense[];
  categories: Category[];
}

export const ExpenseChart = ({ expenses, categories }: ExpenseChartProps) => {
  // Group expenses by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    const categoryId = expense.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = 0;
    }
    acc[categoryId] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Prepare data for the chart
  const chartData = Object.entries(categoryTotals).map(([categoryId, total]) => {
    const category = categories.find(c => c.id === categoryId);
    return {
      name: category?.name || 'Unknown',
      value: total,
      color: category?.color || '#6B7280',
    };
  }).sort((a, b) => b.value - a.value); // Sort by value descending

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No expense data to display</p>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value));
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        <p className="text-sm text-muted-foreground">Total Expenses</p>
      </div>

      {/* Chart bars */}
      <div className="space-y-3">
        {chartData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const share = (item.value / totalValue) * 100;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatCurrency(item.value)}</div>
                  <div className="text-xs text-muted-foreground">{share.toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};