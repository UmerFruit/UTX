// UTX Main Page Component
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Dashboard />
    </div>
  );
};

export default Index;
