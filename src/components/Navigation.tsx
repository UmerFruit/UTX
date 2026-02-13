// Navigation component for UTX
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { DollarSign, LogOut, User, Menu, Trash2, LayoutDashboard, ChartNoAxesCombined, HandCoins, Target } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface NavigationProps {
  onMenuToggle?: () => void;
}

export const Navigation = ({ onMenuToggle }: NavigationProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Budgets', href: '/budgets', icon: Target },
    { title: 'Analysis', href: '/analysis', icon: ChartNoAxesCombined },
    { title: 'Loans', href: '/loans', icon: HandCoins }
  ];

  const handleSignOut = async () => {
    await signOut();

    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });

    // Navigate to landing page after a brief delay to ensure state updates
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 100);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Call the edge function to delete the account
      const { error } = await supabase.functions.invoke('delete-account');

      if (error) {
        throw error;
      }

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });

      // Sign out after deletion
      await signOut();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex h-14 items-center justify-between px-3 sm:px-6">
        {/* Left section: Hamburger + UTX logo */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-primary hover:text-primary/80 transition-colors">
            UTX
          </Link>
        </div>

        {/* Center section: Navigation Links */}
        {user && (
          <nav className="hidden lg:flex items-center space-x-1 absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.title}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right section: Welcome message + controls */}
        {user && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline truncate max-w-[120px] lg:max-w-none">
              Welcome, {user?.email?.split("@")[0] ?? "User"}
            </span>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                This action cannot be undone. This will permanently delete your account.
              </p>
              <p>
                All of the following data will be permanently removed:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All expense records</li>
                <li>All income records</li>
                <li>All categories</li>
                <li>Your account information</li>
                <li>Your authentication credentials</li>
              </ul>
              <p className="font-semibold pt-2">
                Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete my account permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};