import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { EditBudgetForm } from '@/components/EditBudgetForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Target, Calendar, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

const Step1 = () => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Welcome to Budget Planning</h2>
      <p className="text-muted-foreground">
        Let's set up your first budget to help you track spending and achieve your financial goals.
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <CardTitle>Flexible Budgets</CardTitle>
          </div>
          <CardDescription>
            Adaptable spending plans that adjust based on your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• Perfect for variable expenses like groceries or entertainment</li>
            <li>• Allows overspending within reasonable limits</li>
            <li>• Great for day-to-day spending categories</li>
            <li>• More forgiving approach to budgeting</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-all">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <CardTitle>Planned Budgets</CardTitle>
          </div>
          <CardDescription>
            Strict spending limits for fixed financial goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• Ideal for savings goals or fixed expenses</li>
            <li>• Strict limits help you stay disciplined</li>
            <li>• Perfect for debt repayment or emergency funds</li>
            <li>• Ensures you meet important financial milestones</li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <div className="bg-muted/50 rounded-lg p-4">
      <h3 className="font-semibold mb-2">💡 Pro Tip</h3>
      <p className="text-sm text-muted-foreground">
        Start with a flexible budget for your main spending categories, then add planned budgets for specific savings goals.
        You can always adjust these later as you get more comfortable with budgeting.
      </p>
    </div>
  </div>
);

const Step2 = ({ onBudgetSuccess }: { onBudgetSuccess: () => void }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Create Your First Budget</h2>
      <p className="text-muted-foreground">
        Let's create a budget to get you started. You can add more budgets later.
      </p>
    </div>

    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <EditBudgetForm
          mode="create"
          onSuccess={onBudgetSuccess}
        />
      </CardContent>
    </Card>
  </div>
);

const Step3 = () => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Budget Created Successfully!</h2>
      <p className="text-muted-foreground mb-6">
        Congratulations! You've set up your first budget. You're now ready to start tracking your spending and working towards your financial goals.
      </p>

      <div className="bg-muted/50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-3">What's Next?</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• View your daily spending allowance in the calendar</li>
          <li>• Track expenses against your budget</li>
          <li>• Create additional budgets for different categories</li>
          <li>• Monitor your progress and adjust as needed</li>
        </ul>
      </div>

      <Link to="/budgets">
        <Button size="lg" className="px-8">
          Go to Budgets Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  </div>
);

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center mb-8">
    {[1, 2, 3].map((step) => (
      <div key={step} className="flex items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            step <= currentStep
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {step}
        </div>
        {step < 3 && (
          <div
            className={`w-12 h-0.5 mx-2 transition-colors ${
              step < currentStep ? 'bg-primary' : 'bg-muted'
            }`}
          />
        )}
      </div>
    ))}
  </div>
);

const BudgetSetup = () => {
  const { user, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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

  const handleBudgetSuccess = () => {
    setCurrentStep(3);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 />;
      case 2:
        return <Step2 onBudgetSuccess={handleBudgetSuccess} />;
      case 3:
        return <Step3 />;
      default:
        return <Step1 />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="container mx-auto p-3 sm:p-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Budget Setup</h1>
          <p className="text-muted-foreground">Get started with budgeting in just a few simple steps</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Current Step Content */}
        <div className="mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 3 && (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              Step {currentStep} of 3
            </div>

            {currentStep === 1 && (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSetup;
