import { useCurrency, Currency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign } from 'lucide-react';

export const CurrencySwitcher = () => {
  const { currency, setCurrency } = useCurrency();

  const handleCurrencyChange = (value: Currency) => {
    setCurrency(value);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
      <Select value={currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-16 sm:w-20 text-xs sm:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PKR">Rs</SelectItem>
          <SelectItem value="USD">$</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
