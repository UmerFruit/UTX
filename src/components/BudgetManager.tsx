import { useState } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { formatCurrency } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditBudgetForm } from './EditBudgetForm';
import { ConfirmDialog } from './ConfirmDialog';
import { BudgetWithCategories, BudgetType } from '@/types/budget';

interface BudgetManagerProps {
  budgets?: BudgetWithCategories[];
}

export const BudgetManager = ({ budgets: propBudgets }: BudgetManagerProps = {}) => {
  const { deleteBudget } = useBudgets();
  const budgets = propBudgets ?? [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithCategories | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; budget: BudgetWithCategories | null }>({
    open: false,
    budget: null,
  });

  const handleDelete = async (budget: BudgetWithCategories) => {
    setConfirmDelete({ open: true, budget });
  };

  const confirmDeleteBudget = async () => {
    if (!confirmDelete.budget) return;

    try {
      await deleteBudget(confirmDelete.budget.id);
      setConfirmDelete({ open: false, budget: null });
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const getBudgetTypeColor = (type: BudgetType) => {
    return type === BudgetType.FLEXIBLE ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budgets</h2>
          <p className="text-muted-foreground">Manage your budget plans</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No budgets found</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first budget to start tracking expenses!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-2 sm:space-y-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm sm:text-base truncate">{budget.name}</h3>
                      <Badge className={getBudgetTypeColor(budget.type as BudgetType)}>
                        {budget.type === BudgetType.FLEXIBLE ? 'Flexible' : 'Planned'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>
                        {new Date(budget.year, budget.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <span>{budget.budget_categories?.length || 0} categories</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="text-lg font-semibold">
                  {formatCurrency(budget.total_amount || 0)}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingBudget(budget)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(budget)}
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

      {/* Add Budget Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Budget</DialogTitle>
          </DialogHeader>
          <EditBudgetForm
            mode="create"
            onSuccess={() => setShowAddModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Budget Modal */}
      <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
          </DialogHeader>
          {editingBudget && (
            <EditBudgetForm
              budget={editingBudget}
              onSuccess={() => setEditingBudget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, budget: null })}
        title="Delete Budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteBudget}
        variant="destructive"
      />
    </div>
  );
};
