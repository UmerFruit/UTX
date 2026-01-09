// Expense list component for UTX
import { useState, useMemo } from 'react';
import { formatDate, formatCurrency } from '@/utils/dateUtils';
import { Expense, Category,useExpenses } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ChevronLeft, ChevronRight, Search, X, Filter } from 'lucide-react';
import { EditExpenseForm } from './EditExpenseForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
}

export const ExpenseList = ({ expenses, categories }: ExpenseListProps) => {
  const { deleteExpense } = useExpenses();
  const { toast } = useToast();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; expense: Expense | null }>({
    open: false,
    expense: null,
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter expenses based on all criteria
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Search filter (description or notes)
      const matchesSearch = !searchTerm || 
        (expense.description?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategories.length === 0 || 
        (expense.category_id && selectedCategories.includes(expense.category_id));

      // Date range filter
      const expenseDate = new Date(expense.date);
      const matchesStartDate = !startDate || expenseDate >= new Date(startDate);
      const matchesEndDate = !endDate || expenseDate <= new Date(endDate);

      // Amount range filter
      const matchesMinAmount = !minAmount || expense.amount >= Number.parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || expense.amount <= Number.parseFloat(maxAmount);

      return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount;
    });
  }, [expenses, searchTerm, selectedCategories, startDate, endDate, minAmount, maxAmount]);

  // Calculate pagination based on filtered results
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes or filters change
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value));
    setCurrentPage(1);
  };

  // Reset all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
    setCurrentPage(1);
  };

  const handleDelete = async (expense: Expense) => {
    setConfirmDelete({ open: true, expense });
  };

  const confirmDeleteExpense = async () => {
    if (!confirmDelete.expense) return;

    const { error } = await deleteExpense(confirmDelete.expense.id);
    
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

  const hasActiveFilters = searchTerm || selectedCategories.length > 0 || startDate || endDate || minAmount || maxAmount;

  return (
    <>
      {/* Search and Filter Section */}
      <Card className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses by description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex-shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t">
            {/* Category Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Categories</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      selectedCategories.includes(category.id)
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedCategories.includes(category.id) ? 'currentColor' : category.color }}
                    />
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium mb-2 block">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium mb-2 block">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {/* Amount Range Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-amount" className="text-sm font-medium mb-2 block">
                  Min Amount
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="max-amount" className="text-sm font-medium mb-2 block">
                  Max Amount
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="0"
                  value={maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    setCurrentPage(1);
                  }}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredExpenses.length} of {expenses.length} expenses
          </div>
        )}
      </Card>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No expenses match your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
      <div className="space-y-3">
        {paginatedExpenses.map((expense) => (
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
                  <p className="font-medium text-sm sm:text-base truncate">{expense.categories?.name || 'Unknown'}</p>
                  {expense.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">{expense.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                    <span>{formatDate(expense.date)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="font-semibold text-lg sm:text-lg">
                {formatCurrency(expense.amount)}
              </span>
              
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingExpense(expense)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(expense)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredExpenses.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">entries</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, filteredExpenses.length)} of {filteredExpenses.length}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <EditExpenseForm
              expense={editingExpense}
              onSuccess={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, expense: null })}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteExpense}
        variant="destructive"
      />
    </>
  );
};