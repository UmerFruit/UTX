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
    <div className="flex items-center gap-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <Select value={currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PKR">Rs PKR</SelectItem>
          <SelectItem value="USD">$ USD</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
