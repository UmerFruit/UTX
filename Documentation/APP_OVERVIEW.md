# UTX Expense Buddy - Complete App Overview (LLM Reference)

**Version:** 2.1
**Last Updated:** January 2, 2026
**Purpose:** Comprehensive reference for LLM feature planning and development

---

## 🎯 Application Summary

**UTX Expense Buddy** is a full-stack personal finance management web app that helps users track expenses, manage income, analyze spending patterns, and import bank statements. Built with React + Supabase, deployed on Vercel.

**Key Capabilities:**
- Multi-currency support (PKR/USD)
- Bank statement import (PDF/CSV) with auto-parsing
- Expense/Income tracking with categories
- Visual analytics and trend analysis
- Dark/Light theme support
- Secure authentication & data isolation

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Routing:** React Router v6
- **State:** TanStack Query v5 (server state) + React Context (client state)
- **UI Library:** Shadcn/ui (Radix UI + Tailwind CSS)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Icons:** Lucide React
- **PDF Parsing:** pdfjs-dist v5.4

### Backend
- **BaaS:** Supabase (PostgreSQL + Auth + RLS)
- **Database:** PostgreSQL 13+
- **Auth:** Supabase Auth (email/password)
- **API:** Supabase Client (auto-generated REST API)

### DevOps
- **Deployment:** Vercel (auto-deploy from Git)
- **Environment:** Node.js 18+
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint 9 + TypeScript ESLint

---

## 📊 Database Schema

### Tables

#### 1. **categories**
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users (CASCADE DELETE)
name            TEXT NOT NULL
color           TEXT DEFAULT '#3B82F6'
type            TEXT ('expense' | 'income' | 'both')
created_at      TIMESTAMPTZ
```
**Purpose:** User-defined categories for organizing transactions
**Default Categories:** Food & Dining, Transportation, Entertainment, Utilities, Healthcare, Shopping, Other, Salary, Freelance, Investment

#### 2. **expenses**
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES auth.users (CASCADE DELETE)
amount          DECIMAL(10,2) CHECK (amount > 0)
category_id     UUID REFERENCES categories (CASCADE DELETE)
date            DATE CHECK (date >= '2000-01-01' AND date <= NOW() + 1 year)
description     TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ (auto-updated via trigger)
```
**Purpose:** User expense transactions
**Indexes:** user_id, date, category_id, (user_id, date DESC)

#### 3. **income**
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES auth.users (CASCADE DELETE)
amount              DECIMAL(10,2) CHECK (amount > 0)
category_id         UUID REFERENCES categories (CASCADE DELETE)
date                DATE CHECK (date >= '2000-01-01' AND date <= NOW() + 1 year)
description         TEXT
is_recurring        BOOLEAN DEFAULT false
recurring_period    TEXT ('weekly' | 'monthly' | 'yearly')
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ (auto-updated via trigger)
```
**Purpose:** User income tracking with recurring income support
**Indexes:** user_id, date, (user_id, date DESC)

### Security

**Row Level Security (RLS):** Enabled on all tables
- Users can only view/edit/delete their own data
- Policies check `auth.uid() = user_id`

**Triggers:**
- `update_updated_at_column()` - Auto-updates timestamps on expenses/income
- `create_default_categories()` - Creates 10 default categories for new users

---

## 🗂️ Application Architecture

### File Structure
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI primitives (Shadcn)
│   ├── Dashboard.tsx   # Main dashboard with stats
│   ├── ExpenseList.tsx # Expense table view
│   ├── ExpenseChart.tsx # Visual expense breakdown
│   ├── AddExpenseForm.tsx
│   ├── EditExpenseForm.tsx
│   ├── IncomeManager.tsx
│   ├── AnalysisDashboard.tsx # Advanced analytics
│   ├── ImportTransactions.tsx # Bank import
│   └── Navigation.tsx
├── pages/              # Route pages
│   ├── Index.tsx       # Dashboard page
│   ├── Expenses.tsx
│   ├── Income.tsx
│   ├── Analysis.tsx
│   ├── Categories.tsx
│   ├── Auth.tsx
│   └── NotFound.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication
│   ├── useExpenses.ts  # Expense CRUD
│   ├── useIncome.ts    # Income CRUD
│   ├── useCategories.ts # Category CRUD
│   └── use-toast.ts
├── contexts/
│   └── ThemeContext.tsx # Dark/Light theme
├── integrations/supabase/
│   ├── client.ts       # Supabase client config
│   └── types.ts        # Auto-generated DB types
├── utils/
│   ├── dateUtils.ts    # Date helpers + currency formatting
│   ├── exportUtils.ts  # CSV export
│   ├── pdfParser.ts    # PDF parsing orchestrator
│   └── parsers/        # Bank-specific parsers
│       ├── types.ts
│       ├── index.ts
│       ├── hbl.ts      # HBL bank parser
│       └── nayapay.ts  # NayaPay parser
└── lib/
    └── utils.ts        # Tailwind class merger
```

### Routing
```
/             → Index (Dashboard)
/expenses     → Expenses (Full expense list + import)
/income       → Income (Income manager)
/analysis     → Analysis (Advanced analytics)
/categories   → Categories (Category CRUD)
/auth         → Auth (Sign in/up)
*             → NotFound (404 page)
```

---

## 🎨 Core Features

### 1. **Expense Tracking**
**Components:** `AddExpenseForm`, `EditExpenseForm`, `ExpenseList`, `Dashboard`
**Hook:** `useExpenses()`

**Capabilities:**
- Create expense with amount, date, category, description
- Edit existing expenses
- Delete expenses with confirmation
- Filter by date range, category, search term
- View as table or chart
- Display with category colors

**API Calls:**
```typescript
// Create
await supabase.from('expenses').insert([{ user_id, amount, category_id, date, description }])

// Read (with category join)
await supabase.from('expenses').select('*, categories(id, name, color)').order('date', { ascending: false })

// Update
await supabase.from('expenses').update({ amount, description }).eq('id', expenseId)

// Delete
await supabase.from('expenses').delete().eq('id', expenseId)
```

### 2. **Income Management**
**Components:** `IncomeManager`, `AddIncomeForm`, `EditIncomeForm`, `Dashboard`
**Hook:** `useIncome()`

**Capabilities:**
- Track one-time income
- Track recurring income (weekly/monthly/yearly)
- Edit/delete income entries
- Calculate total income for periods
- Display income in dashboard stats

**Recurring Income Logic:**
- Flag `is_recurring` marks recurring entries
- `recurring_period` stores frequency
- Frontend displays badge for recurring items
- Used in cash flow calculations

### 3. **Category Management**
**Components:** `Categories` page
**Hook:** `useCategories()`

**Capabilities:**
- Create custom categories
- Assign colors (hex codes)
- Set type: expense, income, or both
- Edit/delete categories (if not in use)
- Default categories auto-created on signup

**Category Types:**
- `expense`: Only for expenses
- `income`: Only for income
- `both`: Shared category

### 4. **Dashboard**
**Component:** `Dashboard`
**Location:** `/` (homepage)

**Stats Displayed:**
- Monthly Income (clickable to add)
- Monthly Expenses (clickable to add)
- Net Cash Flow (income - expenses)

**Features:**
- Quick add buttons
- Recent expenses list (last 5)
- Expense chart (pie/bar toggle)
- Real-time updates via TanStack Query
- Responsive grid layout

### 5. **Analysis Dashboard**
**Component:** `AnalysisDashboard`
**Location:** `/analysis`

**Advanced Analytics:**
- **Income Analysis:**
  - Income source breakdown (by category)
  - Recurring vs one-time income
  - Income trends over time
  - Average income per category
- **Expense Analysis:**
  - Category-wise spending breakdown
  - Expense trends over time
  - Average expense per category
  - Daily spending patterns
- **Cash Flow:**
  - Monthly net flow (income - expenses)
  - Cumulative balance over time
  - Comparison charts (income vs expenses)
- **Time Controls:**
  - Month/year selector
  - Compare multiple periods
  - Rolling averages

**Charts Used:**
- Pie charts (category breakdown)
- Bar charts (comparisons)
- Line charts (trends)
- Area charts (cumulative)
- Composed charts (multi-metric)

### 6. **Bank Statement Import**
**Component:** `ImportTransactions`
**Location:** `/expenses` (import button)
**Utilities:** `pdfParser.ts`, `parsers/*.ts`

**Supported Banks:**
- HBL (Habib Bank Limited) - PDF
- NayaPay - PDF
- CSV (generic format)

**Import Flow:**
1. User uploads PDF/CSV file
2. App detects bank format
3. Parser extracts transactions (date, amount, description, type)
4. Preview shows all transactions
5. User assigns categories (bulk or individual)
6. User filters/deselects unwanted items
7. Batch import to database

**Parser Architecture:**
```typescript
interface BankParser {
  name: string;
  detect: (text: string) => boolean;  // Identifies bank from PDF text
  parse: (text: string) => ParsedTransaction[];  // Extracts transactions
}

interface ParsedTransaction {
  date: string;           // ISO format
  debit: number;
  credit: number;
  description: string;
  originalDate: string;   // Original format from statement
}
```

**To Add New Bank:**
1. Create parser in `src/utils/parsers/newbank.ts`
2. Implement `BankParser` interface
3. Add to `parsers/index.ts` registry
4. Parser must handle text patterns specific to that bank's PDF format

**Features:**
- Duplicate detection
- Category suggestion
- Bulk category assignment
- Transaction filtering
- Import statistics (success/failed counts)
- Progress indicator

### 7. **Data Export**
**Utility:** `exportUtils.ts`

**Capabilities:**
- Export expenses to CSV
- Includes all fields + category name
- Date-formatted filename

### 8. **Theme System**
**Context:** `ThemeContext`
**Component:** `ThemeToggle`

**Modes:**
- Light
- Dark
- System (auto-detects OS preference)

**Implementation:**
- CSS variables in `index.css`
- Tailwind dark mode classes
- LocalStorage persistence

### 9. **Authentication**
**Hook:** `useAuth()`
**Page:** `/auth`

**Flow:**
- Sign up with email/password (min 6 chars)
- Email verification optional
- Sign in
- Session management via Supabase Auth
- Auto-redirect on auth state change

**Security:**
- Passwords hashed by Supabase
- JWT tokens for API calls
- RLS enforces data isolation

---

## 🔧 Key Hooks

### useAuth()
```typescript
{
  user: User | null
  loading: boolean
  signUp: (email, password) => Promise<{ error }>
  signIn: (email, password) => Promise<{ error }>
  signOut: () => Promise<void>
}
```

### useExpenses()
```typescript
{
  expenses: Expense[]
  categories: Category[]
  loading: boolean
  refetch: () => Promise<void>
  addExpense: (expense) => Promise<{ data, error }>
  updateExpense: (id, updates) => Promise<{ data, error }>
  deleteExpense: (id) => Promise<{ error }>
}
```

### useIncome()
```typescript
{
  income: Income[]
  loading: boolean
  refetch: () => Promise<void>
  createIncome: (income) => Promise<{ data, error }>
  updateIncome: (id, updates) => Promise<{ data, error }>
  deleteIncome: (id) => Promise<{ error }>
}
```

### useCategories()
```typescript
{
  categories: Category[]
  loading: boolean
  refetch: () => Promise<void>
  createCategory: (category) => Promise<{ data, error }>
  updateCategory: (id, updates) => Promise<{ data, error }>
  deleteCategory: (id) => Promise<{ error }>
}
```

---

## 🎨 UI Components (Shadcn)

**Location:** `src/components/ui/`

**Available Components:**
- `Button` - Primary, secondary, ghost, destructive variants
- `Card` - Container with header/content/footer
- `Dialog` - Modal dialogs
- `Select` - Dropdown select menus
- `Input` - Text input fields
- `Textarea` - Multi-line text input
- `Label` - Form labels
- `Badge` - Status indicators
- `Checkbox` - Checkboxes
- `Tabs` - Tabbed interfaces
- `Progress` - Progress bars
- `Toast` - Toast notifications (via useToast)
- `Tooltip` - Hover tooltips
- `Alert Dialog` - Confirmation dialogs
- `Dropdown Menu` - Context menus

**Styling:** Tailwind CSS with design tokens (see `index.css`)

---

## 📐 Utility Functions

### dateUtils.ts
```typescript
formatCurrency(amount: number): string  // "PKR 1,234.56"
getCurrentMonthRange(): { start: Date, end: Date }
isExpenseInRange(date: string, start: Date, end: Date): boolean
getMonthName(date: Date): string
// ... more date helpers
```

### exportUtils.ts
```typescript
exportToCSV(expenses: Expense[], filename: string): void
```

### pdfParser.ts
```typescript
parseBankPDF(file: File): Promise<ParseResult>
parseCSVFile(file: File): Promise<ParseResult>
convertToImportFormat(parsed: ParsedTransaction[]): ImportTransaction[]
getSupportedBankNames(): string[]
```

---

## 🚀 Development

### Setup
```bash
npm install
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Commands
```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint
npm test             # Run tests
npm run test:ui      # Test UI
npm run test:coverage # Coverage report
```

### Database Migrations
Located in `supabase/migrations/`
- Run via Supabase CLI or dashboard
- Versioned with timestamps
- Include: schema, RLS policies, triggers, indexes

---

## 🔐 Security Features

1. **Row Level Security (RLS):** All tables have policies
2. **Data Validation:**
   - Amount must be positive
   - Date must be reasonable (2000-01-01 to 1 year future)
   - Required fields enforced
3. **XSS Protection:** DOMPurify for HTML sanitization (if needed)
4. **CSRF Protection:** Supabase handles token validation
5. **Auth State:** Auto-logout on session expiry
6. **Input Validation:** Zod schemas on forms

---

## 📈 Performance Optimizations

1. **Code Splitting:** Lazy-loaded route components
2. **Query Caching:** TanStack Query with stale-while-revalidate
3. **Memoization:** useMemo for expensive calculations
4. **DB Indexes:** On frequently queried columns
5. **Optimistic Updates:** Immediate UI feedback before API response
6. **Debouncing:** Search inputs (if implemented)

---

## 🐛 Known Limitations

1. **Currency:** Hardcoded to PKR (can be extended to multi-currency)
2. **Budgets:** Not currently implemented (mentioned in old docs)
3. **Export Formats:** Only CSV (no Excel/PDF)
4. **Bank Parsers:** Only HBL and NayaPay (extensible)
5. **Offline Mode:** Requires internet connection
6. **Mobile App:** Web-only (no native apps)

---

## 🎯 Potential Features to Add

### High Priority
1. **Budget System:**
   - Set monthly budgets per category
   - Track budget utilization
   - Alerts when approaching limit
   - Budget vs actual comparison charts

2. **Multi-Currency Support:**
   - Add currency field to expenses/income
   - Currency conversion API integration
   - Default currency per user
   - Mixed-currency reports

3. **Recurring Expenses:**
   - Similar to recurring income
   - Auto-generate transactions
   - Skip/modify recurrence

4. **Tags/Labels:**
   - Multiple tags per transaction
   - Cross-category organization
   - Tag-based filtering

### Medium Priority
5. **Advanced Filtering:**
   - Complex filter builder
   - Saved filter presets
   - Amount range filters
   - Date range presets (last 7 days, etc.)

6. **Export Enhancements:**
   - PDF reports
   - Excel export
   - Chart exports
   - Email reports

7. **Bank Parser Improvements:**
   - More bank support
   - OCR for scanned statements
   - Automatic category suggestions based on description
   - Transaction matching/deduplication

8. **Notifications:**
   - Budget alerts
   - Recurring expense reminders
   - Weekly/monthly summaries
   - Email notifications

### Low Priority
9. **Shared Accounts:**
   - Family/roommate expense splitting
   - Shared categories
   - Permissions management

10. **Data Insights:**
    - AI-powered spending insights
    - Anomaly detection
    - Spending predictions
    - Personalized tips

11. **Goals:**
    - Savings goals
    - Goal tracking
    - Progress visualization

12. **Integrations:**
    - Bank API direct connections
    - Calendar integration
    - Google Sheets sync

---

## 📋 Feature Implementation Guide

**When planning a new feature, consider:**

1. **Database Changes:**
   - New tables/columns needed?
   - RLS policies?
   - Indexes?
   - Migration script

2. **Backend:**
   - API endpoints (Supabase handles this)
   - Custom functions needed?
   - Triggers?

3. **Frontend:**
   - New pages/routes?
   - New components?
   - Custom hooks?
   - Form validation?

4. **State Management:**
   - TanStack Query for server data
   - React Context for global client state
   - Local state for UI-only data

5. **Testing:**
   - Unit tests for utilities
   - Integration tests for hooks
   - E2E tests for critical flows

6. **Documentation:**
   - Update this file
   - API reference
   - User-facing help text

---

## 🔗 Important Files to Check

**For Database Schema:**
- `supabase/migrations/*.sql`
- `src/integrations/supabase/types.ts`

**For Business Logic:**
- `src/hooks/*.ts`
- `src/utils/*.ts`

**For UI Components:**
- `src/components/*.tsx`
- `src/components/ui/*.tsx`

**For Routing:**
- `src/App.tsx`
- `src/pages/*.tsx`

**For Styling:**
- `src/index.css`
- `tailwind.config.ts`

**For Configuration:**
- `package.json`
- `vite.config.ts`
- `tsconfig.json`

---

## 🎓 Development Patterns

### Adding a New Feature (Example: Budgets)

1. **Database:**
   ```sql
   CREATE TABLE budgets (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users,
     category_id UUID REFERENCES categories,
     amount DECIMAL(10,2),
     period TEXT, -- 'monthly', 'yearly'
     start_date DATE,
     created_at TIMESTAMPTZ
   );
   -- Add RLS policies
   ```

2. **Types:**
   - Run `supabase gen types typescript` to update types.ts
   - Or manually add interface in hook

3. **Hook:**
   ```typescript
   // src/hooks/useBudgets.ts
   export interface Budget { ... }
   export function useBudgets() {
     const [budgets, setBudgets] = useState<Budget[]>([]);
     const fetchBudgets = async () => { ... };
     const createBudget = async (budget) => { ... };
     // ... CRUD operations
     return { budgets, loading, createBudget, ... };
   }
   ```

4. **Component:**
   ```typescript
   // src/components/BudgetManager.tsx
   export const BudgetManager = () => {
     const { budgets, createBudget } = useBudgets();
     // ... UI logic
   };
   ```

5. **Page:**
   ```typescript
   // src/pages/Budgets.tsx
   import { BudgetManager } from '@/components/BudgetManager';
   const Budgets = () => (
     <div><Navigation /><BudgetManager /></div>
   );
   ```

6. **Route:**
   ```typescript
   // src/App.tsx
   <Route path="/budgets" element={<Budgets />} />
   ```

### State Management Pattern

**Server State (TanStack Query):**
```typescript
const queryClient = new QueryClient();
const { data, isLoading, refetch } = useQuery({
  queryKey: ['expenses'],
  queryFn: fetchExpenses,
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

**Client State (Context):**
```typescript
const ThemeContext = createContext<ThemeState>(initialState);
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system');
  return <ThemeContext.Provider value={{ theme, setTheme }}>
    {children}
  </ThemeContext.Provider>;
};
```

**Component State:**
```typescript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({ ... });
```

---

## 🎉 Summary for LLMs

**This app is a personal finance tracker with:**
- ✅ Expense/Income tracking with categories
- ✅ Bank statement import (PDF/CSV parsing)
- ✅ Visual analytics and trend charts
- ✅ Dark/Light theme
- ✅ Secure authentication
- ✅ Responsive design
- ✅ CSV export

**Tech:** React + TypeScript + Supabase + Tailwind + Vite

**Missing (but easy to add):**
- ❌ Budgets
- ❌ Multi-currency
- ❌ Recurring expenses
- ❌ Advanced notifications
- ❌ More bank parsers

**When planning features:**
1. Check if database changes needed (migrations)
2. Create/update hooks for data operations
3. Build UI components
4. Add routes if needed
5. Update this documentation

**Code is clean, modular, and follows React best practices. Easy to extend!**
