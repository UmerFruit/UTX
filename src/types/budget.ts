// filepath: src/types/budget.ts

// Budget type enum
export enum BudgetType {
  FLEXIBLE = 'flexible',
  PLANNED = 'planned'
}

// Base budget type from database
export interface Budget {
  id: string;
  user_id: string;
  name: string;
  type: 'flexible' | 'planned';
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

// Budget category from junction table
export interface BudgetCategory {
  id: string;
  budget_id: string;
  category_id: string;
  amount: number;
  budget_user_id: string | null;
  budget_month: number | null;
  budget_year: number | null;
  created_at: string;
}

// Category details (from categories table)
export interface CategoryDetails {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

// Budget category with populated category details
export interface BudgetCategoryWithDetails extends BudgetCategory {
  category: CategoryDetails;
}

// Budget with all its categories populated
export interface BudgetWithCategories extends Budget {
  budget_categories: BudgetCategoryWithDetails[];
  total_amount?: number; // Computed: sum of all category amounts
}

// Form data for creating a budget
export interface CreateBudgetFormData {
  name: string;
  type: 'flexible' | 'planned';
  month: number;
  year: number;
  categories: Array<{
    category_id: string;
    amount: number;
  }>;
}

// Form data for updating a budget
export interface UpdateBudgetFormData {
  name?: string;
  categories?: Array<{
    category_id: string;
    amount: number;
  }>;
}

// Rolling budget calculations
export interface DailyBudgetData {
  day: number;
  date: string;
  spent: number;
  allowance: number;
  accumulated: number;
  status: 'good' | 'warning' | 'over';
}

export interface BudgetSummary {
  // Flexible budget data
  dailyAllowance: number;
  availableToday: number;
  accumulated: number;
  flexibleTotal: number;
  flexibleSpent: number;
  
  // Planned budget data
  plannedTotal: number;
  plannedUsed: number;
  
  // Time information
  currentDay: number;
  daysLeft: number;
  totalDays: number;
  
  // Historical data
  weeklyData: DailyBudgetData[];
  
  // Status
  isOverBudget: boolean;
  hasDebt: boolean;
}