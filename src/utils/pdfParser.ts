/**
 * Bank Statement Parser Module
 * 
 * Multi-bank PDF statement parser with auto-detection.
 * 
 * Bank-specific parsers are in the ./parsers/ directory.
 * To add a new bank, create a parser file and add it to parsers/index.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PDF.JS SETUP
// ═══════════════════════════════════════════════════════════════════════════════

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type { ParsedTransaction, ImportTransaction, ParseResult } from './parsers/types';
import { ParsedTransaction, ImportTransaction, ParseResult } from './parsers/types';
import { detectBank, getSupportedBankNames, cleanHBLDescriptions } from './parsers/index';
export { detectBank, getSupportedBankNames } from './parsers/index';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateTextNotEmpty(text: string): void {
  if (!text || text.trim().length === 0) {
    throw new Error(
      'PDF appears to be empty or corrupted. ' +
      'Could not extract any text from the PDF file. ' +
      'Please ensure the PDF is not password-protected or corrupted.'
    );
  }
}

function validateTransactions(transactions: ParsedTransaction[], bankName: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!transactions || transactions.length === 0) {
    throw new Error(
      `No transactions found in the ${bankName} statement. ` +
      `The PDF format may have changed or the file may be invalid. ` +
      `Please ensure you're uploading a valid ${bankName} account statement.`
    );
  }
  
  if (transactions.length > 1000) {
    warnings.push(`High transaction count: ${transactions.length} transactions found.`);
  }
  
  let invalidCount = 0;
  
  for (const t of transactions) {
    if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
      invalidCount++;
    }
  }
  
  if (invalidCount > transactions.length * 0.5) {
    throw new Error(
      `Too many invalid transactions (${invalidCount}/${transactions.length}). ` +
      `The PDF format may not be compatible or the file may be corrupted.`
    );
  }
  
  return { valid: true, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function processTextItems(items: { str: string; transform: number[] }[]): string {
  if (items.length === 0) return '';
  
  const sortedItems = items
    .filter(item => 'str' in item && item.str.trim())
    .map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }))
    .sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.x - b.x;
    });
  
  let currentY = sortedItems[0]?.y;
  let currentLine = '';
  let fullText = '';
  
  for (const item of sortedItems) {
    if (Math.abs(item.y - currentY) > 5) {
      if (currentLine.trim()) {
        fullText += currentLine.trim() + '\n';
      }
      currentLine = item.str;
      currentY = item.y;
    } else {
      currentLine += ' ' + item.str;
    }
  }
  
  if (currentLine.trim()) {
    fullText += currentLine.trim() + '\n';
  }
  
  return fullText;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const items = textContent.items as { str: string; transform: number[] }[];
    fullText += processTextItems(items);
  }
  
  console.log('Extracted PDF text (first 2000 chars):', fullText.substring(0, 2000));
  return fullText;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PARSE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a bank statement with auto-detection and AI cleaning
 */
export async function parseStatement(pdfText: string): Promise<ParseResult> {
  // Step 1: Validate text is not empty
  validateTextNotEmpty(pdfText);
  
  // Step 2: Detect bank
  const detectedBank = detectBank(pdfText);
  
  if (!detectedBank) {
    const supportedBanks = getSupportedBankNames().join(', ');
    throw new Error(
      `Unsupported bank statement format. ` +
      `Could not detect which bank this statement belongs to. ` +
      `Currently supported banks: ${supportedBanks}`
    );
  }
  
  // Step 3: Parse transactions (basic extraction)
  console.log(` Parsing ${detectedBank.parser.name} statement...`);
  let transactions = detectedBank.parser.parse(pdfText);
  console.log(` Parsed ${transactions.length} transactions`);
  
  // Step 4: Clean descriptions with AI (bank-specific)
  console.log('Cleaning descriptions with AI...');
  try {
    if (detectedBank.id === 'hbl') {
      transactions = await cleanHBLDescriptions(transactions);
      console.log(' AI cleaning complete');
    }
    // Add other bank cleaning functions here as needed
  } catch (error) {
    console.warn(' AI cleaning failed, using basic descriptions:', error);
  }
  
  // Step 5: Validate transactions
  validateTransactions(transactions, detectedBank.parser.name);
  
  // Step 6: Calculate summary
  const totalIncome = transactions.reduce((sum, t) => sum + t.credit, 0);
  const totalExpenses = transactions.reduce((sum, t) => sum + t.debit, 0);
  
  return {
    bank: {
      id: detectedBank.id,
      name: detectedBank.parser.name
    },
    transactions,
    summary: {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      transactionCount: transactions.length
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API (Backwards Compatible)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main function to parse a PDF file and return transactions
 */
export async function parseBankPDF(file: File): Promise<ParsedTransaction[]> {
  const text = await extractTextFromPDF(file);
  const result = await parseStatement(text);
  return result.transactions;
}

/**
 * Convert parsed transactions to import format
 */
export function convertToImportFormat(transactions: ParsedTransaction[]): ImportTransaction[] {
  return transactions.map(t => ({
    date: t.date,
    amount: t.debit > 0 ? t.debit : t.credit,
    type: t.debit > 0 ? 'expense' as const : 'income' as const,
    description: t.description || 'Imported from PDF',
    category_id: null
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

function convertDateToISO(dateStr: string): string {
  // Try DD-MM-YYYY format
  const ddmmyyyy = new RegExp(/^(\d{1,2})-(\d{1,2})-(\d{4})$/).exec(dateStr);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD format (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  return dateStr;
}

export function parseCSV(csvContent: string): ParsedTransaction[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const transactions: ParsedTransaction[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    if (parts.length >= 3) {
      const [dateStr, debitStr, creditStr, ...descParts] = parts;
      const debit = Number.parseFloat(debitStr) || 0;
      const credit = Number.parseFloat(creditStr) || 0;
      const description = descParts.join(',').replaceAll(/^"/g, '').replaceAll(/"$/g, '').trim();
      
      transactions.push({
        originalDate: dateStr,
        date: convertDateToISO(dateStr),
        debit,
        credit,
        description: description || 'Imported from CSV'
      });
    }
  }
  
  return transactions;
}

export async function parseCSVFile(file: File): Promise<ParsedTransaction[]> {
  const text = await file.text();
  return parseCSV(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR EXTENSIBILITY
// ═══════════════════════════════════════════════════════════════════════════════


