// filepath: src/hooks/useBudgets.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/integrations/supabase/budgets';
import { useToast } from './use-toast';

export const useBudgets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createBudgetMutation = useMutation({
    mutationFn: budgetService.createBudget,
    onSuccess: (data) => {
      // Invalidate all budget queries to refresh all views
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Success',
        description: 'Budget created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateBudgetNameMutation = useMutation({
    mutationFn: ({ budgetId, name }: { budgetId: string; name: string }) =>
      budgetService.updateBudgetName(budgetId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Success',
        description: 'Budget updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: budgetService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Success',
        description: 'Budget deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const upsertCategoryMutation = useMutation({
    mutationFn: ({ 
      budgetId, 
      categoryId, 
      amount 
    }: { 
      budgetId: string; 
      categoryId: string; 
      amount: number;
    }) => budgetService.upsertBudgetCategory(budgetId, categoryId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeCategoryMutation = useMutation({
    mutationFn: ({ budgetId, categoryId }: { budgetId: string; categoryId: string }) =>
      budgetService.removeCategoryFromBudget(budgetId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Success',
        description: 'Category removed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createBudget: createBudgetMutation.mutateAsync,
    updateBudgetName: (budgetId: string, name: string) =>
      updateBudgetNameMutation.mutateAsync({ budgetId, name }),
    deleteBudget: deleteBudgetMutation.mutateAsync,
    upsertCategory: (budgetId: string, categoryId: string, amount: number) =>
      upsertCategoryMutation.mutateAsync({ budgetId, categoryId, amount }),
    removeCategory: (budgetId: string, categoryId: string) =>
      removeCategoryMutation.mutateAsync({ budgetId, categoryId }),
    isCreating: createBudgetMutation.isPending,
    isUpdating: updateBudgetNameMutation.isPending || upsertCategoryMutation.isPending,
    isDeleting: deleteBudgetMutation.isPending || removeCategoryMutation.isPending,
  };
};