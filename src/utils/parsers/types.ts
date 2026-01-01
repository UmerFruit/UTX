/**
 * Shared types for bank parsers
 */

export interface ParsedTransaction {
  date: string; // ISO format YYYY-MM-DD
  debit: number;
  credit: number;
  description: string;
  originalDate: string;
}

export interface ImportTransaction {
  date: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  category_id: string | null;
}

export interface BankParser {
  name: string;
  detect: (text: string) => boolean;
  parse: (text: string) => ParsedTransaction[];
}

export interface ParseResult {
  bank: { id: string; name: string };
  transactions: ParsedTransaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    net: number;
    transactionCount: number;
  };
}
