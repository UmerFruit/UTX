import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, Tag, BarChart3, DollarSign, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exportToCSV } from '@/utils/exportUtils';
import { useExpenses } from '@/hooks/useExpenses';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { expenses } = useExpenses();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const handleExportCSV = () => {
    let filteredExpenses = expenses;
    
    // Filter by date range if dates are provided
    if (exportStartDate && exportEndDate) {
      filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        const startDate = new Date(exportStartDate);
        const endDate = new Date(exportEndDate);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }
    
    exportToCSV(filteredExpenses, 'utx-expenses');
    setShowExportDialog(false);
  };

  const navItems = [
    {
      title: 'Analysis',
      href: '/analysis',
      icon: BarChart3,
    },
    {
      title: 'Expenses',
      href: '/expenses',
      icon: DollarSign,
    },
    {
      title: 'Income',
      href: '/income',
      icon: TrendingUp,
    },
    {
      title: 'Categories',
      href: '/categories',
      icon: Tag,
    },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          aria-label="Close sidebar"
        />
      )}

      {/* Retractable Sidebar */}
      <Card className={cn(
        "fixed top-0 left-0 h-full w-64 p-4 z-50 transition-transform duration-300 ease-in-out shadow-lg",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tools</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Navigation Items */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link key={item.href} to={item.href} onClick={onClose}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start hover:bg-accent",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </div>
          
          {/* Desktop: Show message that nav is in header */}
          
        </div>
        
        <div className={cn("pt-4 border-t", "lg:mt-0")}>

          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-accent"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Export Expenses</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={exportEndDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExportStartDate('');
                      setExportEndDate('');
                      setShowExportDialog(false);
                    }}
                  >
                    Clear Dates
                  </Button>
                  <Button onClick={handleExportCSV}>
                    Export
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </>
  );
};

export { Sidebar };