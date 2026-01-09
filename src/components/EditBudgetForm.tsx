import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBudgets } from '@/hooks/useBudgets';
import { BudgetWithCategories, BudgetType } from '@/types/budget';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface CategoryAmount {
  category_id: string;
  amount: string;
}

interface EditBudgetFormProps {
  budget?: BudgetWithCategories; // Optional for create mode
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
}

export const EditBudgetForm = ({
  budget,
  onSuccess,
  mode = 'edit'
}: EditBudgetFormProps) => {
  const { createBudget, updateBudgetName, upsertCategory, removeCategory, isCreating, isUpdating } = useBudgets();
  const { toast } = useToast();
  const { categories: allCategories } = useCategories();
  const [loading, setLoading] = useState(false);

  // Filter to only show expense categories (expense and both types)
  const expenseCategories = allCategories.filter(cat => cat.type === 'expense' || cat.type === 'both');

  // Get current date for default values
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = now.getFullYear();

  // Form state
  const [formData, setFormData] = useState({
    name: budget?.name || '',
    type: budget?.type || BudgetType.FLEXIBLE,
    month: budget?.month || currentMonth,
    year: budget?.year || currentYear,
  });

  const [categoryAmounts, setCategoryAmounts] = useState<CategoryAmount[]>(() => {
    if (budget?.budget_categories) {
      return budget.budget_categories.map(bc => ({
        category_id: bc.category_id,
        amount: bc.amount.toString(),
      }));
    }
    return [];
  });

  const handleAddCategory = () => {
    if (expenseCategories.length > 0) {
      // Find first category not already added
      const usedCategoryIds = new Set<string>(categoryAmounts.map(ca => ca.category_id));
      const availableCategory = expenseCategories.find(cat => !usedCategoryIds.has(cat.id));
      
      if (availableCategory) {
        setCategoryAmounts([...categoryAmounts, {
          category_id: availableCategory.id,
          amount: '0',
        }]);
      }
    }
  };

  const handleRemoveCategory = (index: number) => {
    setCategoryAmounts(categoryAmounts.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (index: number, field: keyof CategoryAmount, value: string) => {
    const updated = [...categoryAmounts];
    updated[index] = { ...updated[index], [field]: value };
    setCategoryAmounts(updated);
  };

  const getAvailableCategories = (currentCategoryId: string) => {
    const usedIds = new Set<string>(categoryAmounts.map(ca => ca.category_id).filter(id => id !== currentCategoryId));
    return expenseCategories.filter(cat => !usedIds.has(cat.id));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Budget name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (categoryAmounts.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one category is required',
        variant: 'destructive',
      });
      return false;
    }

    for (const ca of categoryAmounts) {
      const amount = Number.parseFloat(ca.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        toast({
          title: 'Error',
          description: 'All category amounts must be positive numbers',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const createBudgetLogic = async () => {
    const categories = categoryAmounts.map(ca => ({
      category_id: ca.category_id,
      amount: Number.parseFloat(ca.amount),
    }));

    await createBudget({
      name: formData.name.trim(),
      type: formData.type,
      month: formData.month,
      year: formData.year,
      categories,
    });

    toast({
      title: 'Success',
      description: 'Budget created successfully',
    });
    onSuccess?.();
  };

  const updateBudgetLogic = async () => {
    if (!budget) return;

    if (formData.name !== budget.name) {
      await updateBudgetName(budget.id, formData.name.trim());
    }

    for (const ca of categoryAmounts) {
      await upsertCategory(budget.id, ca.category_id, Number.parseFloat(ca.amount));
    }

    const currentCategoryIds = new Set(categoryAmounts.map(ca => ca.category_id));
    const originalCategoryIds = budget.budget_categories.map(bc => bc.category_id);
    const removedCategoryIds = originalCategoryIds.filter(id => !currentCategoryIds.has(id));

    for (const categoryId of removedCategoryIds) {
      await removeCategory(budget.id, categoryId);
    }

    toast({
      title: 'Success',
      description: 'Budget updated successfully',
    });
    onSuccess?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      if (mode === 'create') {
        await createBudgetLogic();
      } else {
        await updateBudgetLogic();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const getCategoryName = (categoryId: string) => {
    return expenseCategories.find(cat => cat.id === categoryId)?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId: string) => {
    return expenseCategories.find(cat => cat.id === categoryId)?.color || '#666666';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Budget Name and Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Budget Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., January Budget"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Budget Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: string) => setFormData({ ...formData, type: value as 'flexible' | 'planned' })}
            disabled={mode === 'edit'} // Can't change type after creation
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BudgetType.FLEXIBLE}>Flexible</SelectItem>
              <SelectItem value={BudgetType.PLANNED}>Planned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Month and Year */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="month">Month *</Label>
          <Select
            value={formData.month.toString()}
            onValueChange={(value) => setFormData({ ...formData, month: Number.parseInt(value) })}
            disabled={mode === 'edit'} // Can't change month after creation
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <SelectItem key={month} value={month.toString()}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Select
            value={formData.year.toString()}
            onValueChange={(value) => setFormData({ ...formData, year: Number.parseInt(value) })}
            disabled={mode === 'edit'} // Can't change year after creation
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Categories *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCategory}
            disabled={loading || categoryAmounts.length >= expenseCategories.length}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>

        {categoryAmounts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
            No categories added. Click "Add Category" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {categoryAmounts.map((ca, index) => (
              <div key={ca.category_id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Select
                    value={ca.category_id}
                    onValueChange={(value) => handleCategoryChange(index, 'category_id', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(ca.category_id) }}
                          />
                          {getCategoryName(ca.category_id)}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCategories(ca.category_id).map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32">
                  <Input
                    type="number"
                    min="0"
                    value={ca.amount}
                    onChange={(e) => handleCategoryChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCategory(index)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {categoryAmounts.length > 0 && (
          <div className="flex justify-end text-sm font-medium pt-2 border-t">
            <span className="text-muted-foreground">Total:</span>
            <span className="ml-2">
              Rs. {categoryAmounts.reduce((sum, ca) => sum + (Number.parseFloat(ca.amount) || 0), 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading || isCreating || isUpdating}>
          {(loading || isCreating || isUpdating) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {mode === 'create' ? 'Create Budget' : 'Update Budget'}
        </Button>
      </div>
    </form>
  );
};
