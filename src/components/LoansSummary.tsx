// Loans Summary Widget for Dashboard
import { useLoans } from '@/hooks/useLoans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/dateUtils';
import { HandCoins, Wallet, TrendingUp, TrendingDown, ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const getBorderColorClass = (netPosition: number) => {
  if (netPosition > 0) {
    return "border-l-green-500 hover:bg-green-50/50 dark:hover:bg-green-950/20";
  }
  if (netPosition < 0) {
    return "border-l-red-500 dark:hover:bg-red-950/20";
  }
  return "border-l-muted";
};

const getNetPositionColor = (netPosition: number) => {
  if (netPosition > 0) {
    return "text-green-600";
  }
  if (netPosition < 0) {
    return "text-red-600";
  }
  return "text-muted-foreground";
};

const getNetPositionIcon = (netPosition: number) => {
  return netPosition >= 0 ? (
    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
  ) : (
    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
  );
};

const getNetPositionBackground = (netPosition: number) => {
  return netPosition >= 0
    ? "bg-green-100 dark:bg-green-900/30"
    : "bg-red-100 dark:bg-red-900/30";
};

export const LoansSummary = () => {
  const { getLoansSummary, getActiveLoans, loading } = useLoans();
  const navigate = useNavigate();

  const summary = getLoansSummary();
  const activeLoans = getActiveLoans();

  const borderColorClass = getBorderColorClass(summary.netPosition);

  if (loading) {
    return (
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasLoans = activeLoans.length > 0;

  return (
    <Card 
      className={cn(
        "shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer",
        "border-l-4",
        borderColorClass
      )}
      onClick={() => navigate('/loans')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          Outstanding Loans
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          View All
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {hasLoans ? (
          <div className="space-y-3">
            {/* Lent Amount */}
            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                  <HandCoins className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-sm text-muted-foreground">You Lent</span>
              </div>
              <span className="font-semibold text-green-600">
                {formatCurrency(summary.totalLent)}
              </span>
            </div>

            {/* Borrowed Amount */}
            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Wallet className="h-3.5 w-3.5 text-red-600" />
                </div>
                <span className="text-sm text-muted-foreground">You Borrowed</span>
              </div>
              <span className="font-semibold text-red-600">
                {formatCurrency(summary.totalBorrowed)}
              </span>
            </div>

            {/* Net Position */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-full",
                  getNetPositionBackground(summary.netPosition)
                )}>
                  {getNetPositionIcon(summary.netPosition)}
                </div>
                <span className="text-sm font-medium">Net Position</span>
              </div>
              <span className={cn(
                "font-bold text-lg",
                getNetPositionColor(summary.netPosition)
              )}>
                {summary.netPosition >= 0 ? '+' : ''}
                {formatCurrency(summary.netPosition)}
              </span>
            </div>

            {/* Active Loans Count */}
            <p className="text-xs text-muted-foreground text-center pt-2">
              {activeLoans.length} active loan{activeLoans.length === 1 ? '' : 's'}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-1">No active loans</p>
            <p className="text-xs text-muted-foreground">
              Track money you've lent or borrowed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoansSummary;
