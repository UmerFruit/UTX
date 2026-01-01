/**
 * Bank Parser Registry
 * 
 * Central registry for all supported bank parsers.
 * To add a new bank, import its parser and add it to this registry.
 */

import { BankParser } from './types';
import { detectNayaPay, parseNayaPayText } from './nayapay';
import { detectHBL, parseHBLText } from './hbl';

// Export cleaning functions
export { cleanHBLDescriptions } from './hbl';

/**
 * Registry of all supported bank parsers
 */
export const BANK_PARSERS: Record<string, BankParser> = {
  nayapay: {
    name: 'NayaPay',
    detect: detectNayaPay,
    parse: parseNayaPayText
  },
  hbl: {
    name: 'HBL (Habib Bank Limited)',
    detect: detectHBL,
    parse: parseHBLText
  }
  // Add more banks here:
  // meezan: {
  //   name: 'Meezan Bank',
  //   detect: detectMeezan,
  //   parse: parseMeezanText,
  // }
};

/**
 * Get list of all supported bank names
 */
export function getSupportedBankNames(): string[] {
  return Object.values(BANK_PARSERS).map(parser => parser.name);
}

/**
 * Detect which bank a PDF belongs to
 */
export function detectBank(pdfText: string): { id: string; parser: BankParser } | null {
  console.log('🔍 Detecting bank...');
  
  if (!pdfText || typeof pdfText !== 'string') {
    return null;
  }
  
  for (const [bankId, parser] of Object.entries(BANK_PARSERS)) {
    if (parser.detect(pdfText)) {
      console.log(`✅ Detected: ${parser.name}`);
      return { id: bankId, parser };
    }
  }
  
  return null;
}
