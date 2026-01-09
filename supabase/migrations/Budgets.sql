-- Step 1: Drop everything existing
DROP TRIGGER IF EXISTS set_budgets_updated_at ON public.budgets;
DROP FUNCTION IF EXISTS update_budgets_updated_at();
DROP TABLE IF EXISTS public.budget_categories CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;

-- Step 2: Create main budgets table
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('flexible', 'planned')),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name, month, year)
);

-- Step 3: Create budget_categories junction table
CREATE TABLE public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    budget_user_id UUID,
    budget_month INTEGER,
    budget_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(budget_id, category_id)
);

-- Step 4: Create indexes
CREATE INDEX idx_budgets_user_month ON public.budgets(user_id, month, year);
CREATE INDEX idx_budget_categories_budget ON public.budget_categories(budget_id);
CREATE INDEX idx_budget_categories_category ON public.budget_categories(category_id);

-- Step 5: Ensure one category per user per month
CREATE UNIQUE INDEX idx_one_category_per_user_month
    ON public.budget_categories (category_id, budget_user_id, budget_month, budget_year);

-- Step 5b: Trigger to keep denormalized columns in sync
CREATE OR REPLACE FUNCTION public.sync_budget_denorm_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    SELECT b.user_id, b.month, b.year
      INTO NEW.budget_user_id, NEW.budget_month, NEW.budget_year
    FROM public.budgets b
    WHERE b.id = NEW.budget_id;

    IF NEW.budget_user_id IS NULL THEN
      RAISE EXCEPTION 'Invalid budget_id: %', NEW.budget_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_budget_denorm_columns
  BEFORE INSERT OR UPDATE ON public.budget_categories
  FOR EACH ROW EXECUTE FUNCTION public.sync_budget_denorm_columns();

-- Step 6: Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for budgets
CREATE POLICY "Users can view their own budgets"
    ON public.budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
    ON public.budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
    ON public.budgets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
    ON public.budgets FOR DELETE
    USING (auth.uid() = user_id);

-- Step 8: RLS Policies for budget_categories
CREATE POLICY "Users can view their own budget categories"
    ON public.budget_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_categories.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own budget categories"
    ON public.budget_categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets b
            WHERE b.id = budget_categories.budget_id
            AND b.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = budget_categories.category_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own budget categories"
    ON public.budget_categories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_categories.budget_id
            AND budgets.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_categories.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own budget categories"
    ON public.budget_categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_categories.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- Step 9: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_budgets_updated_at();