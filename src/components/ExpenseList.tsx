// Expense list component for UTX
import { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDate } from '@/utils/dateUtils';
import { Expense, Category } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditExpenseForm } from './EditExpenseForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExpenses } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  onExpenseChange?: () => void;
}

export const ExpenseList = ({ expenses, categories, onExpenseChange }: ExpenseListProps) => {
  const { deleteExpense } = useExpenses();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleDelete = async (expense: Expense) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const { error } = await deleteExpense(expense.id);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete expense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Expense deleted successfully",
        });
        onExpenseChange?.();
      }
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No expenses found</p>
        <p className="text-sm text-muted-foreground mt-1">Start tracking your expenses by adding one!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-2 sm:space-y-0"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: expense.categories?.color || '#6B7280' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base truncate">{expense.description || 'No description'}</p>
                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>{formatDate(expense.date)}</span>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {expense.categories?.name || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="font-semibold text-lg sm:text-lg">
                {formatCurrency(expense.amount)}
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(expense)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <EditExpenseForm
              expense={editingExpense}
              categories={categories}
              onSuccess={() => setEditingExpense(null)}
              onExpenseChange={onExpenseChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};