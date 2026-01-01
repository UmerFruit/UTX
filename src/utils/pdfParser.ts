// PDF Parser utility for bank statements
// Parses PDF bank statements and extracts transactions

// Dynamically import pdfjs-dist for code splitting
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Use unpkg CDN which has the correct version paths
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

export interface ParsedTransaction {
  date: string; // ISO format YYYY-MM-DD
  debit: number;
  credit: number;
  description: string;
  originalDate: string; // Original format from PDF
}

export interface ImportTransaction {
  date: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  category_id: string | null;
}

/**
 * Parse a PDF file and extract text content
 * Uses spatial analysis to properly reconstruct lines
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by their Y position to reconstruct lines
    const items = textContent.items as any[];
    
    if (items.length === 0) continue;
    
    // Sort by Y position (descending - PDF coordinates start from bottom)
    // then by X position (ascending)
    const sortedItems = items
      .filter(item => 'str' in item && item.str.trim())
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }))
      .sort((a, b) => {
        // Group by Y with tolerance of 5 units
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.x - b.x;
      });
    
    // Reconstruct lines based on Y position
    let currentY = sortedItems[0]?.y;
    let currentLine = '';
    
    for (const item of sortedItems) {
      if (Math.abs(item.y - currentY) > 5) {
        // New line
        if (currentLine.trim()) {
          fullText += currentLine.trim() + '\n';
        }
        currentLine = item.str;
        currentY = item.y;
      } else {
        // Same line - add space between items
        currentLine += ' ' + item.str;
      }
    }
    
    // Don't forget the last line
    if (currentLine.trim()) {
      fullText += currentLine.trim() + '\n';
    }
  }
  
  console.log('Extracted PDF text (first 2000 chars):', fullText.substring(0, 2000));
  return fullText;
}

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD (ISO format)
 */
function convertDateToISO(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Parse bank statement text and extract transactions
 * Adapted from the original parser.js logic
 */
export function parseBankStatement(text: string): ParsedTransaction[] {
  if (!text) return [];
  
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];
  
  console.log('Total lines:', lines.length);
  console.log('First 20 lines:', lines.slice(0, 20));
  
  // Find transaction start - look for header patterns
  const start = findTransactionStart(lines);
  console.log('Transaction start index:', start);
  
  // Parse transactions
  parseTransactionLines(lines, start, transactions);
  
  console.log('Parsed transactions:', transactions.length);
  
  return transactions;
}

/**
 * Find the starting index of transaction data in the lines
 */
function findTransactionStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    // Pattern 1: "Transaction" on one line, "Date" on next
    if (lines[i] === 'Transaction' && lines[i + 1]?.startsWith('Date')) {
      return i + 2; // Start after header
    }
    // Pattern 2: Line contains "Transaction" and next line has "Date Value Date"
    if (lines[i] === 'Transaction' && lines[i + 1]?.includes('Date Value Date')) {
      return i + 2; // Start after header
    }
    // Pattern 3: Header line "Date Value Date Description Debit Credit Balance"
    if (lines[i].includes('Date Value Date') && lines[i].includes('Description')) {
      return i + 1; // Start right after this header
    }
  }
  return 0;
}

/**
 * Determine if a transaction is a credit based on description
 */
function isCredit(desc: string): boolean {
  return desc.includes(' FR ') || 
         desc.toLowerCase().includes('transfer from') || 
         desc.toLowerCase().includes('received') || 
         desc.toLowerCase().includes('credit');
}

/**
 * Parse amount from string, removing commas
 */
function parseAmount(amtStr: string): number {
  return Number.parseFloat(amtStr.replaceAll(',', ''));
}

/**
 * Parse individual transaction lines
 * HBL format: DD-MM-YYYY DD-MM-YYYY Description Amount Balance (all on same line)
 */
function parseTransactionLines(
  lines: string[], 
  startIndex: number, 
  transactions: ParsedTransaction[]
): void {
  // Pattern for HBL format: date date description amount balance
  // Example: "01-01-2026 31-12-2025 Funds Transfer SM01091443E717F5 TO 150.00 2,050.65"
  const lineWithAmountPattern = /^(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;
  
  // Pattern for line starting with date (continuation of previous or new)
  const dateStartPattern = /^(\d{2}-\d{2}-\d{4})/;
  
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    
    // Try to match full transaction line with amounts
    const fullMatch = lineWithAmountPattern.exec(line);
    if (fullMatch) {
      const [, txnDate, , descPart, amountStr, ] = fullMatch;
      const amount = parseAmount(amountStr);
      
      // Build full description by checking subsequent lines
      let description = descPart;
      let j = i + 1;
      while (j < lines.length && !dateStartPattern.exec(lines[j])) {
        description += ' ' + lines[j];
        j++;
      }
      
      const txn: ParsedTransaction = {
        originalDate: txnDate,
        date: convertDateToISO(txnDate),
        debit: isCredit(description) ? 0 : amount,
        credit: isCredit(description) ? amount : 0,
        description: description.trim()
      };
      
      transactions.push(txn);
      i = j;
      continue;
    }
    
    i++;
  }
}

/**
 * Main function to parse a PDF file and return transactions
 */
export async function parseBankPDF(file: File): Promise<ParsedTransaction[]> {
  const text = await extractTextFromPDF(file);
  return parseBankStatement(text);
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

/**
 * Parse CSV content (for CSV import support)
 */
export function parseCSV(csvContent: string): ParsedTransaction[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const transactions: ParsedTransaction[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      const [dateStr, debitStr, creditStr] = parts;
      const debit = Number.parseFloat(debitStr) || 0;
      const credit = Number.parseFloat(creditStr) || 0;
      
      transactions.push({
        originalDate: dateStr,
        date: convertDateToISO(dateStr),
        debit,
        credit,
        description: 'Imported from CSV'
      });
    }
  }
  
  return transactions;
}

/**
 * Parse CSV file
 */
export async function parseCSVFile(file: File): Promise<ParsedTransaction[]> {
  const text = await file.text();
  return parseCSV(text);
}
