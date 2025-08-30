// Edit expense form component for UTX
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses, Category, Expense } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditExpenseFormProps {
  expense: Expense;
  categories: Category[];
  onSuccess: () => void;
}

export const EditExpenseForm = ({ expense, categories, onSuccess }: EditExpenseFormProps) => {
  const { updateExpense } = useExpenses();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: expense.amount.toString(),
    category_id: expense.category_id,
    date: expense.date,
    description: expense.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.amount || !formData.category_id || !formData.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await updateExpense(expense.id, {
        amount,
        category_id: formData.category_id,
        date: formData.date,
        description: formData.description.trim() || null,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update expense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select 
          value={formData.category_id} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
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

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What was this expense for?"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Expense'
          )}
        </Button>
      </div>
    </form>
  );
};