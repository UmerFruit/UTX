-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, color) VALUES
    (NEW.id, 'Food & Dining', '#EF4444'),
    (NEW.id, 'Transportation', '#3B82F6'),
    (NEW.id, 'Entertainment', '#8B5CF6'),
    (NEW.id, 'Utilities', '#F59E0B'),
    (NEW.id, 'Healthcare', '#10B981'),
    (NEW.id, 'Shopping', '#EC4899'),
    (NEW.id, 'Other', '#6B7280');
  RETURN NEW;
END;
$$;