import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelectWithCreate } from '@/components/CategorySelectWithCreate';
import { useIncome } from '@/hooks/useIncome';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type RecurringPeriod = 'weekly' | 'monthly' | 'yearly' | '';

interface AddIncomeFormProps {
  onSuccess?: () => void;
}

export const AddIncomeForm = ({ onSuccess }: AddIncomeFormProps) => {
  const { createIncome } = useIncome();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    description: '',
    is_recurring: false,
    recurring_period: '' as RecurringPeriod,
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
      const { error } = await createIncome({
        amount,
        category_id: formData.category_id || null,
        date: formData.date,
        description: formData.description.trim() || null,
        is_recurring: formData.is_recurring,
        recurring_period: formData.is_recurring ? formData.recurring_period || null : null,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add income",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Income added successfully",
        });

        // Reset form
        setFormData({
          amount: '',
          category_id: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          is_recurring: false,
          recurring_period: '' as RecurringPeriod,
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
          defaultCategoryType="income"
          filterByType="income"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What was this income for?"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked as boolean }))}
          />
          <Label htmlFor="is_recurring">Recurring Income</Label>
        </div>
      </div>

      {formData.is_recurring && (
        <div className="space-y-2">
          <Label htmlFor="recurring_period">Recurring Period</Label>
          <Select
            value={formData.recurring_period}
            onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_period: value as RecurringPeriod }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Income'
          )}
        </Button>
      </div>
    </form>
  );
};
