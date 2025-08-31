import { useState } from 'react';
import { useIncome } from '@/hooks/useIncome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DollarSign, Calendar, Repeat } from 'lucide-react';
import { AddIncomeForm } from './AddIncomeForm';
import { formatCurrency } from '@/utils/dateUtils';

export const IncomeManager = () => {
  const { income, loading } = useIncome();
  const [showAddIncome, setShowAddIncome] = useState(false);

  // Calculate income statistics
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const monthlyIncome = income.filter(item => {
    const itemDate = new Date(item.date);
    const currentMonth = new Date();
    return itemDate.getMonth() === currentMonth.getMonth() && 
           itemDate.getFullYear() === currentMonth.getFullYear();
  }).reduce((sum, item) => sum + item.amount, 0);

  const recurringIncome = income.filter(item => item.is_recurring);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Income Tracking</h2>
          <p className="text-muted-foreground">Manage your income sources and track cash flow</p>
        </div>
        <Dialog open={showAddIncome} onOpenChange={setShowAddIncome}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Income</DialogTitle>
            </DialogHeader>
            <AddIncomeForm onSuccess={() => setShowAddIncome(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Income Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">All time income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">Current month income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Sources</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recurringIncome.length}</div>
            <p className="text-xs text-muted-foreground">Active recurring income</p>
          </CardContent>
        </Card>
      </div>

      {/* Income List */}
      {income.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No income recorded yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start tracking your income sources to get a complete picture of your finances
            </p>
            <Button onClick={() => setShowAddIncome(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Income History</CardTitle>
            <CardDescription>Your recorded income sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {income.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{item.source}</h4>
                      {item.is_recurring && (
                        <Badge variant="secondary" className="text-xs">
                          <Repeat className="h-3 w-3 mr-1" />
                          {item.recurring_period}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">
                      +{formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
