// Add expense form component for UTX
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategorySelectWithCreate } from '@/components/CategorySelectWithCreate';
import { useExpenses } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddExpenseFormProps {
  onSuccess?: () => void;
}

export const AddExpenseForm = ({ onSuccess }: AddExpenseFormProps) => {
  const { addExpense } = useExpenses();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.amount || !formData.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const amount = Number.parseFloat(formData.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await addExpense({
        amount,
        category_id: formData.category_id || null,
        date: formData.date,
        description: formData.description.trim() || null,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add expense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Expense added successfully",
        });

        // Reset form
        setFormData({
          amount: '',
          category_id: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
        });

        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error,
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
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
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
        <Label htmlFor="category">Category</Label>
        <CategorySelectWithCreate
          value={formData.category_id}
          onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
          placeholder="Select a category"
          defaultCategoryType="expense"
          filterByType="expense"
        />
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
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Expense'
          )}
        </Button>
      </div>
    </form>
  );
};