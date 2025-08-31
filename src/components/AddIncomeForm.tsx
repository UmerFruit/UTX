import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIncome } from '@/hooks/useIncome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const incomeSchema = z.object({
  source: z.string().min(1, 'Income source is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface AddIncomeFormProps {
  onSuccess?: () => void;
}

export const AddIncomeForm = ({ onSuccess }: AddIncomeFormProps) => {
  const { createIncome } = useIncome();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      is_recurring: false,
      recurring_period: undefined,
    },
  });

  const isRecurring = form.watch('is_recurring');

  const onSubmit = async (data: IncomeFormData) => {
    setIsSubmitting(true);
    
    const incomeData = {
      source: data.source,
      amount: data.amount,
      date: data.date,
      description: data.description || null,
      is_recurring: data.is_recurring,
      recurring_period: data.is_recurring ? data.recurring_period || null : null,
    };

    const { error } = await createIncome(incomeData);

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
      form.reset();
      onSuccess?.();
    }

    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Income Source</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Salary, Freelance, Investment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional details about this income..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Recurring Income</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Check if this is a regular income source
                </p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {isRecurring && (
          <FormField
            control={form.control}
            name="recurring_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recurring Period</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Income'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
