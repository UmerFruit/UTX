// Add Transaction Form Component for Loans
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLoans, Loan, CreateTransactionData } from '@/hooks/useLoans';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowDownLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/dateUtils';

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  transaction_type: z.enum(['borrowed_more', 'repaid', 'lent_more']),
  date: z.string().min(1, 'Date is required'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;
type TransactionType = 'borrowed_more' | 'repaid' | 'lent_more';

interface AddTransactionFormProps {
  loan: Loan;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultType?: 'repaid' | 'more';
}

export const AddTransactionForm = ({ loan, onSuccess, onCancel, defaultType = 'repaid' }: AddTransactionFormProps) => {
  const { addTransaction } = useLoans();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine available transaction types based on loan type
  const getDefaultTransactionType = (): TransactionType => {
    if (defaultType === 'more') {
      return loan.loan_type === 'lent' ? 'lent_more' : 'borrowed_more';
    }
    return 'repaid';
  };

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: undefined as unknown as number, // Start empty, not 0
      transaction_type: getDefaultTransactionType(),
      date: new Date().toISOString().split('T')[0],
    },
  });

  const watchedType = form.watch('transaction_type');
  const watchedAmount = form.watch('amount');

  const onSubmit = async (data: TransactionFormData) => {
    // Validate repayment doesn't exceed outstanding amount
    if (data.transaction_type === 'repaid' && data.amount > loan.total_amount) {
      toast({
        title: 'Error',
        description: `Payment amount exceeds outstanding balance of ${formatCurrency(loan.total_amount)}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const transactionData: CreateTransactionData = {
      amount: data.amount,
      transaction_type: data.transaction_type,
      date: data.date,
    };

    const { error } = await addTransaction(loan.id, transactionData);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transaction',
        variant: 'destructive',
      });
    } else {
      const newBalance = data.transaction_type === 'repaid'
        ? loan.total_amount - data.amount
        : loan.total_amount + data.amount;
      let actionText;
      if (data.transaction_type === 'repaid') {
        actionText = 'Payment recorded'
      }
      else if (data.transaction_type === 'lent_more') {
        actionText = 'Additional loan recorded'
      }
      else {
        actionText = 'Additional borrowing recorded'
      }

      toast({
        title: actionText,
        description: newBalance === 0
          ? `Loan with ${loan.person_name} is now settled!`
          : `New balance: ${formatCurrency(newBalance)}`,
      });
      form.reset();
      onSuccess?.();
    }

    setIsSubmitting(false);
  };
  const getTypeLabel = (type: TransactionType) => {
    if (type === 'repaid') {
      return loan.loan_type === 'lent' ? 'Received Payment' : 'Made Payment';
    }
    if (type === 'lent_more') return 'Lent More';
    return 'Borrowed More';
  };

  const getTypeDescription = (type: TransactionType) => {
    if (type === 'repaid') {
      return loan.loan_type === 'lent'
        ? `${loan.person_name} paid you back`
        : `You paid ${loan.person_name}`;
    }
    if (type === 'lent_more') return `You gave more money to ${loan.person_name}`;
    return `You borrowed more from ${loan.person_name}`;
  };

  return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Current Balance Display */}
      <div className={cn(
        'p-4 rounded-lg text-center',
        loan.loan_type === 'lent' ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
      )}>
        <p className="text-sm text-muted-foreground mb-1">Current Outstanding</p>
        <p className={cn(
          'text-2xl font-bold',
          loan.loan_type === 'lent' ? 'text-green-600' : 'text-red-600'
        )}>
          {formatCurrency(loan.total_amount)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {loan.loan_type === 'lent' ? `${loan.person_name} owes you` : `You owe ${loan.person_name}`}
        </p>
      </div>

      {/* Transaction Type Selection */}
      <FormField
        control={form.control}
        name="transaction_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Transaction Type</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => field.onChange('repaid')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
                    'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30',
                    field.value === 'repaid'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-muted'
                  )}
                >
                  <ArrowDownLeft className={cn(
                    'h-6 w-6 transition-colors',
                    field.value === 'repaid' ? 'text-blue-600' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'font-medium text-sm',
                    field.value === 'repaid' ? 'text-blue-600' : 'text-muted-foreground'
                  )}>
                    {getTypeLabel('repaid')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(loan.loan_type === 'lent' ? 'lent_more' : 'borrowed_more')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
                    'hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30',
                    (field.value === 'lent_more' || field.value === 'borrowed_more')
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                      : 'border-muted'
                  )}
                >
                  <Plus className={cn(
                    'h-6 w-6 transition-colors',
                    (field.value === 'lent_more' || field.value === 'borrowed_more') ? 'text-orange-600' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'font-medium text-sm',
                    (field.value === 'lent_more' || field.value === 'borrowed_more') ? 'text-orange-600' : 'text-muted-foreground'
                  )}>
                    {loan.loan_type === 'lent' ? 'Lent More' : 'Borrowed More'}
                  </span>
                </button>
              </div>
            </FormControl>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {getTypeDescription(field.value)}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Amount */}
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₨</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={watchedType === 'repaid' ? loan.total_amount : undefined}
                  placeholder="0.00"
                  className="pl-8 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                  value={field.value || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === '' ? undefined : Number.parseFloat(val));
                  }}
                />
              </div>
            </FormControl>
            {watchedType === 'repaid' && watchedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Remaining after payment: {formatCurrency(Math.max(0, loan.total_amount - watchedAmount))}
              </p>
            )}
            {(watchedType === 'lent_more' || watchedType === 'borrowed_more') && watchedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                New balance: {formatCurrency(loan.total_amount + watchedAmount)}
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Quick Amount Buttons for Repayment */}
      {watchedType === 'repaid' && (
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => form.setValue('amount', loan.total_amount)}
          >
            Full Amount ({formatCurrency(loan.total_amount)})
          </Button>
          {loan.total_amount > 1000 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.setValue('amount', Math.round(loan.total_amount / 2))}
            >
              Half ({formatCurrency(Math.round(loan.total_amount / 2))})
            </Button>
          )}
        </div>
      )}

      {/* Date */}
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

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            watchedType === 'repaid'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-orange-600 hover:bg-orange-700'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            'Record Transaction'
          )}
        </Button>
      </div>
    </form>
  </Form>
);
};

export default AddTransactionForm;
