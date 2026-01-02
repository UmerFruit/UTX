// Loans Page - Complete loan management
import { useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLoans, Loan } from '@/hooks/useLoans';
import { useToast } from '@/hooks/use-toast';
import { AddLoanForm } from '@/components/AddLoanForm';
import { LoanDetail } from '@/components/LoanDetail';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrency, formatDate } from '@/utils/dateUtils';
import { 
  Plus, 
  HandCoins, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  CircleDollarSign,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Navigate } from 'react-router-dom';

// Helper functions for styling
const getNetPositionBorderColor = (netPosition: number) => {
  if (netPosition > 0) return "border-l-green-500";
  if (netPosition < 0) return "border-l-red-500";
  return "border-l-muted";
};

const getNetPositionTextColor = (netPosition: number) => {
  if (netPosition > 0) return "text-green-600";
  if (netPosition < 0) return "text-red-600";
  return "text-muted-foreground";
};

const getNetPositionDescription = (netPosition: number) => {
  if (netPosition > 0) return 'People owe you';
  if (netPosition < 0) return 'You owe people';
  return 'All balanced';
};

const getNetPositionIcon = (netPosition: number) => {
  return netPosition >= 0 ? (
    <TrendingUp className="h-6 w-6 text-green-600" />
  ) : (
    <TrendingDown className="h-6 w-6 text-red-600" />
  );
};

const getNetPositionBackground = (netPosition: number) => {
  return netPosition >= 0
    ? "bg-green-100 dark:bg-green-900/30"
    : "bg-red-100 dark:bg-red-900/30";
};

const getLoanAmountColor = (status: string, loanType: string) => {
  if (status === 'settled') {
    return "text-muted-foreground";
  }
  return loanType === 'lent' ? "text-green-600" : "text-red-600";
};

// Extracted components
const LoanCard = ({ loan, onSelect, onDelete }: { loan: Loan; onSelect: (loan: Loan) => void; onDelete?: (loan: Loan) => void }) => (
  <Card 
    className={cn(
      "cursor-pointer transition-all duration-200 hover:shadow-md",
      "border-l-4",
      loan.loan_type === 'lent'? "border-l-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20" 
        : "border-l-red-500 dark:hover:bg-red-950/20"
    )}
    onClick={() => onSelect(loan)}
  >
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              "p-1.5 rounded-full",
              loan.loan_type === 'lent' 
                ? "bg-green-100 dark:bg-green-900/30" 
                : "bg-red-100 dark:bg-red-900/30"
            )}>
              {loan.loan_type === 'lent' ? (
                <HandCoins className="h-4 w-4 text-green-600" />
              ) : (
                <Wallet className="h-4 w-4 text-red-600" />
              )}
            </div>
            <span className="font-semibold truncate">{loan.person_name}</span>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            getLoanAmountColor(loan.status, loan.loan_type)
          )}>
            {formatCurrency(loan.total_amount)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(loan.created_at)}</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                loan.loan_type === 'lent' 
                  ? "border-green-500 text-green-600" 
                  : "border-red-500 text-red-600"
              )}
            >
              {loan.loan_type === 'lent' ? 'Lent' : 'Borrowed'}
            </Badge>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex flex-col items-end gap-2">
          {loan.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // This will be handled by parent
              }}
              className="text-xs"
            >
              <CircleDollarSign className="mr-1 h-3 w-3" />
              Add Payment
            </Button>
          )}
          {loan.status === 'settled' && onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(loan);
              }}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(loan);
            }}
          >
            Details
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ type, onCreateLoan }: { type: 'active' | 'settled'; onCreateLoan?: () => void }) => (
  <div className="text-center py-12">
    <div className={cn(
      "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
      type === 'active' ? "bg-muted" : "bg-green-100 dark:bg-green-900/30"
    )}>
      {type === 'active' ? (
        <Users className="h-8 w-8 text-muted-foreground" />
      ) : (
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      )}
    </div>
    <h3 className="text-lg font-semibold mb-2">
      {type === 'active' ? 'No active loans' : 'No settled loans yet'}
    </h3>
    <p className="text-muted-foreground max-w-sm mx-auto">
      {type === 'active' 
        ? 'Start tracking money you lend to or borrow from friends.' 
        : 'Settled loans will appear here once you fully repay or get repaid.'}
    </p>
    {type === 'active' && onCreateLoan && (
      <Button className="mt-4" onClick={onCreateLoan}>
        <Plus className="mr-2 h-4 w-4" />
        Create First Loan
      </Button>
    )}
  </div>
);

const Loans = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { 
    loans, 
    loading, 
    getActiveLoans, 
    getSettledLoans, 
    getLoansSummary,
    deleteLoan,
    refetch 
  } = useLoans();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [quickPayLoan, setQuickPayLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  const activeLoans = useMemo(() => getActiveLoans(), [getActiveLoans]);
  const settledLoans = useMemo(() => getSettledLoans(), [getSettledLoans]);
  const summary = useMemo(() => getLoansSummary(), [getLoansSummary]);

  // Redirect to auth if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleLoanAdded = () => {
    setShowAddLoan(false);
    refetch();
  };

  const handleQuickPaySuccess = () => {
    setQuickPayLoan(null);
    refetch();
  };

  const handleLoanUpdate = () => {
    refetch();
    // If viewing a loan that got updated, refresh its data
    if (selectedLoan) {
      const updated = loans.find(l => l.id === selectedLoan.id);
      if (updated) {
        setSelectedLoan(updated);
      }
    }
  };

  const handleQuickPay = (loan: Loan) => {
    setQuickPayLoan(loan);
  };

  const handleDeleteLoan = (loan: Loan) => {
    setLoanToDelete(loan);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return;
    
    const { error } = await deleteLoan(loanToDelete.id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete loan",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Loan deleted successfully",
      });
      refetch();
    }
    setLoanToDelete(null);
  };

  // If a loan is selected, show its detail view
  if (selectedLoan) {
    const currentLoan = loans.find(l => l.id === selectedLoan.id) || selectedLoan;
    return (
      <div className="min-h-screen bg-background">
        <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-4xl">
          <LoanDetail 
            loan={currentLoan}
            onBack={() => setSelectedLoan(null)}
            onUpdate={handleLoanUpdate}
          />
        </main>
      </div>
    );
  }

  const renderSummaryCards = () => (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
      <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Money Lent</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalLent)}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeLoans.filter(l => l.loan_type === 'lent').length} active
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <HandCoins className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Money Borrowed</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalBorrowed)}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeLoans.filter(l => l.loan_type === 'borrowed').length} active
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <Wallet className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn("border-l-4 shadow-sm hover:shadow-md transition-all duration-200", getNetPositionBorderColor(summary.netPosition))}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Net Position</p>
              <p className={cn("text-2xl font-bold", getNetPositionTextColor(summary.netPosition))}>
                {summary.netPosition >= 0 ? '+' : ''}{formatCurrency(summary.netPosition)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getNetPositionDescription(summary.netPosition)}
              </p>
            </div>
            <div className={cn("p-3 rounded-full", getNetPositionBackground(summary.netPosition))}>
              {getNetPositionIcon(summary.netPosition)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLoanCard = (loan: Loan) => (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        "border-l-4",
        loan.loan_type === 'lent'? "border-l-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20" 
          : "border-l-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20"
      )}
      onClick={() => setSelectedLoan(loan)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                "p-1.5 rounded-full",
                loan.loan_type === 'lent' 
                  ? "bg-green-100 dark:bg-green-900/30" 
                  : "bg-red-100 dark:bg-red-900/30"
              )}>
                {loan.loan_type === 'lent' ? (
                  <HandCoins className="h-4 w-4 text-green-600" />
                ) : (
                  <Wallet className="h-4 w-4 text-red-600" />
                )}
              </div>
              <span className="font-semibold truncate">{loan.person_name}</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              getLoanAmountColor(loan.status, loan.loan_type)
            )}>
              {formatCurrency(loan.total_amount)}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDate(loan.created_at)}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  loan.loan_type === 'lent' 
                    ? "border-green-500 text-green-600" 
                    : "border-red-500 text-red-600"
                )}
              >
                {loan.loan_type === 'lent' ? 'Lent' : 'Borrowed'}
              </Badge>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex flex-col items-end gap-2">
            {loan.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickPay(loan);
                }}
                className="text-xs"
              >
                <CircleDollarSign className="mr-1 h-3 w-3" />
                Add Payment
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLoan(loan);
              }}
            >
              Details
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (type: 'active' | 'settled') => (
    <div className="text-center py-12">
      <div className={cn(
        "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
        type === 'active' ? "bg-muted" : "bg-green-100 dark:bg-green-900/30"
      )}>
        {type === 'active' ? (
          <Users className="h-8 w-8 text-muted-foreground" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {type === 'active' ? 'No active loans' : 'No settled loans yet'}
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        {type === 'active' 
          ? 'Start tracking money you lend to or borrow from friends.' 
          : 'Settled loans will appear here once you fully repay or get repaid.'}
      </p>
      {type === 'active' && (
        <Button className="mt-4" onClick={() => setShowAddLoan(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create First Loan
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 mb-6">
          <Dialog open={showAddLoan} onOpenChange={setShowAddLoan}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Loan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Loan</DialogTitle>
                <DialogDescription>
                  Record money you've lent to someone or borrowed from someone
                </DialogDescription>
              </DialogHeader>
              <AddLoanForm 
                onSuccess={handleLoanAdded}
                onCancel={() => setShowAddLoan(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {renderSummaryCards()}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          /* Loans Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active" className="gap-2">
                <Clock className="h-4 w-4" />
                Active
                {activeLoans.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeLoans.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settled" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Settled
                {settledLoans.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {settledLoans.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeLoans.length === 0 ? (
                renderEmptyState('active')
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} onSelect={setSelectedLoan} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settled" className="space-y-4">
              {settledLoans.length === 0 ? (
                renderEmptyState('settled')
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {settledLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} onSelect={setSelectedLoan} onDelete={handleDeleteLoan} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Quick Payment Dialog */}
        <Dialog open={!!quickPayLoan} onOpenChange={(open) => !open && setQuickPayLoan(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment</DialogTitle>
              <DialogDescription>
                Record a payment for loan with {quickPayLoan?.person_name}
              </DialogDescription>
            </DialogHeader>
            {quickPayLoan && (
              <AddTransactionForm
                loan={quickPayLoan}
                onSuccess={handleQuickPaySuccess}
                onCancel={() => setQuickPayLoan(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!loanToDelete}
          onOpenChange={(open) => !open && setLoanToDelete(null)}
          title="Delete Settled Loan"
          description={`Are you sure you want to delete the settled loan with ${loanToDelete?.person_name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteLoan}
          variant="destructive"
        />
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={() => setShowAddLoan(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Loans;
