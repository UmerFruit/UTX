import { useState, useMemo } from 'react';
import { useIncome, Income } from '@/hooks/useIncome';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Repeat, Edit, Trash2, Search, X, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditIncomeForm } from './EditIncomeForm';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface IncomeManagerProps {
  income?: Income[];
}

export const IncomeManager = ({ income: propIncome }: IncomeManagerProps = {}) => {
  const { income: hookIncome, loading, deleteIncome } = useIncome();
  const { categories } = useCategories();
  const income = propIncome ?? hookIncome;
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; income: Income | null }>({
    open: false,
    income: null,
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get income categories (type 'income' or 'both')
  const incomeCategories = categories.filter(cat => !cat.type || cat.type === 'income' || cat.type === 'both');

  // Filter income based on all criteria
  const filteredIncome = useMemo(() => {
    return income.filter((item) => {
      // Search filter (description or notes)
      const matchesSearch = !searchTerm || 
        (item.description?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategories.length === 0 || 
        (item.category_id && selectedCategories.includes(item.category_id));

      // Date range filter
      const incomeDate = new Date(item.date);
      const matchesStartDate = !startDate || incomeDate >= new Date(startDate);
      const matchesEndDate = !endDate || incomeDate <= new Date(endDate);

      // Amount range filter
      const matchesMinAmount = !minAmount || item.amount >= Number.parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || item.amount <= Number.parseFloat(maxAmount);

      return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate && matchesMinAmount && matchesMaxAmount;
    });
  }, [income, searchTerm, selectedCategories, startDate, endDate, minAmount, maxAmount]);

  // Calculate pagination based on filtered results
  const totalPages = Math.ceil(filteredIncome.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncome = filteredIncome.slice(startIndex, endIndex);

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

  const handleDelete = async (income: Income) => {
    setConfirmDelete({ open: true, income });
  };

  const confirmDeleteIncome = async () => {
    if (!confirmDelete.income) return;

    const { error } = await deleteIncome(confirmDelete.income.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete income",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Income deleted successfully",
      });
    }
    setConfirmDelete({ open: false, income: null });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => `income-loading-skeleton-${i}`).map((key) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg">
            <div className="flex-1">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </div>
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasActiveFilters = searchTerm || selectedCategories.length > 0 || startDate || endDate || minAmount || maxAmount;

  return (
    <div className="space-y-6">
      {/* Search and Filter Section */}
      <Card className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search income by description..."
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
                {incomeCategories.map((category) => (
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
            Showing {filteredIncome.length} of {income.length} income entries
          </div>
        )}
      </Card>

      {/* Quick Add Income */}
      {income.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No income found</p>
          <p className="text-sm text-muted-foreground mt-1">Start tracking your income by adding one!</p>
        </div>
      )}

      {/* All Income */}
      {filteredIncome.length === 0 && income.length > 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No income matches your filters</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </div>
      ) : filteredIncome.length > 0 && (
        <div className="space-y-3">
          {paginatedIncome.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-2 sm:space-y-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.categories?.color || '#6B7280' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{item.categories?.name || 'Unknown'}</p>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      {item.is_recurring && (
                        <Badge variant="secondary" className="text-xs">
                          <Repeat className="h-3 w-3 mr-1" />
                          {item.recurring_period}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="text-lg font-semibold text-green-600">
                  +{formatCurrency(item.amount)}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingIncome(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredIncome.length > 0 && (
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
              {startIndex + 1}-{Math.min(endIndex, filteredIncome.length)} of {filteredIncome.length}
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
      
      <Dialog open={!!editingIncome} onOpenChange={() => setEditingIncome(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          {editingIncome && (
            <EditIncomeForm
              income={editingIncome}
              onSuccess={() => setEditingIncome(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, income: null })}
        title="Delete Income"
        description="Are you sure you want to delete this income entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteIncome}
        variant="destructive"
      />
    </div>
  );
};

