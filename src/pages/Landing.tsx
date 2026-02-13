import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Suspense, lazy } from 'react';

const DnaHelix = lazy(() => import('@/components/DnaHelix'));

const Landing = () => {
  const { user, loading } = useAuth();

  // If authenticated, go straight to dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="bg-gray-900 text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-sm bg-gray-900/90">
        <nav className="container mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#gradient)" />
              <path
                d="M16 8L8 12V20L16 24L24 20V12L16 8Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 16L20 14M16 16L12 14M16 16V20"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="hsl(262, 83%, 58%)" />
                  <stop offset="1" stopColor="hsl(262, 83%, 45%)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-bold text-white">UTX</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-white transition">
              How it works
            </a>
            <Link
              to="/auth"
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-8 pt-20 pb-16 relative">
        {/* Floating Particles Background */}
        <div className="absolute w-full h-full overflow-hidden pointer-events-none z-0">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((left, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-landing-float"
              style={{
                left: `${left}%`,
                animationDelay: `${[0, 2, 4, 1, 3, 5, 2.5, 4.5, 1.5][i]}s`,
              }}
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full mb-6">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-purple-300">Free &amp; Open Source</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Smart expense tracking for better financial decisions
            </h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              UTX gives you complete visibility into your spending. Track every dollar, set realistic
              budgets, and understand your financial patterns with powerful analytics.
            </p>
            <div className="flex gap-4">
              <Link
                to="/auth"
                className="bg-purple-600 text-white px-14 py-3.5 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg shadow-purple-600/30"
              >
                Start Tracking Now
              </Link>
            </div>
            
          </div>

          {/* 3D DNA Strand Animation */}
          <Suspense
            fallback={
              <div className="w-full h-[600px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            }
          >
            <DnaHelix />
          </Suspense>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need to manage your money
            </h2>
            <p className="text-lg text-gray-400">
              Powerful features designed to give you complete financial clarity
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              gradient="from-purple-500 to-purple-600"
              title="Visual Analytics"
              description="Interactive charts show spending trends, category breakdowns, and monthly comparisons at a glance."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              }
            />
            <FeatureCard
              gradient="from-green-500 to-green-600"
              title="Smart Budgets"
              description="Set category limits, track progress in real-time, and get notified before you overspend."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              }
            />
            <FeatureCard
              gradient="from-blue-500 to-blue-600"
              title="CSV Import/Export"
              description="Bulk import transactions from bank statements and export your data anytime you need it."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              }
            />
            <FeatureCard
              gradient="from-orange-500 to-orange-600"
              title="Custom Categories"
              description="Organize expenses your way with flexible categories and tags that match your lifestyle."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              }
            />
            <FeatureCard
              gradient="from-pink-500 to-pink-600"
              title="Loan Tracking"
              description="Monitor borrowed and lent money, track repayments, and never lose track of IOUs."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              }
            />
            <FeatureCard
              gradient="from-indigo-500 to-indigo-600"
              title="Private & Secure"
              description="Your financial data is encrypted and stored securely. Only you have access to your information."
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              }
            />
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="mt-32 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Start tracking in minutes</h2>
            <p className="text-lg text-gray-400">Simple setup, powerful results</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up with email in under 30 seconds' },
              { step: '2', title: 'Add Expenses', desc: 'Log transactions manually or import from CSV' },
              { step: '3', title: 'Get Insights', desc: 'See where your money goes with visual reports' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-400">{item.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-12 text-center max-w-4xl mx-auto border border-purple-500/30">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to take control?</h2>
          <p className="text-xl text-purple-100 mb-8">
            Join and start making smarter financial decisions today
          </p>
          <Link
            to="/auth"
            className="inline-block bg-white text-purple-700 px-10 py-4 rounded-lg font-bold hover:bg-gray-100 transition shadow-xl"
          >
            Create Your Free Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-8 py-12 mt-32 border-t border-gray-800">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="url(#gradient2)" />
              <path
                d="M16 8L8 12V20L16 24L24 20V12L16 8Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 16L20 14M16 16L12 14M16 16V20"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="gradient2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="hsl(262, 83%, 58%)" />
                  <stop offset="1" stopColor="hsl(262, 83%, 45%)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="font-semibold text-white">UTX</span>
          </div>
          <p className="text-sm text-gray-500">&copy; 2026 UTX. Built for better money management.</p>
        </div>
      </footer>
    </div>
  );
};

/* ── Feature Card sub-component ── */
interface FeatureCardProps {
  gradient: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FeatureCard = ({ gradient, title, description, icon }: FeatureCardProps) => (
  <div className="group bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition">
    <div
      className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition`}
    >
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default Landing;
