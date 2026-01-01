/**
 * Bank Statement Parser Module
 * 
 * Multi-bank PDF statement parser with auto-detection.
 * Currently supports: NayaPay
 * 
 * To add a new bank:
 * 1. Add detection function (detectBankName)
 * 2. Add parser function (parseBankNameText)
 * 3. Add to SUPPORTED_BANKS config
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
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

interface BankConfig {
  name: string;
  detect: (text: string) => boolean;
  parse: (text: string) => ParsedTransaction[];
  extractHeaderTotals?: (text: string) => { expenses: number | null; income: number | null };
}

interface ParseResult {
  bank: { id: string; name: string };
  transactions: ParsedTransaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    net: number;
    transactionCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORTED BANKS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for all supported banks.
 * To add a new bank, add an entry here with detect and parse functions.
 */
const SUPPORTED_BANKS: Record<string, BankConfig> = {
  nayapay: {
    name: 'NayaPay',
    detect: detectNayaPay,
    parse: parseNayaPayText,
    extractHeaderTotals: extractNayaPayHeaderTotals
  }
  // Add more banks here:
  // hbl: {
  //   name: 'HBL',
  //   detect: detectHBL,
  //   parse: parseHBLText,
  // }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT INJECTION PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /ignore\s+(all\s+)?above\s+instructions?/gi,
  /disregard\s+(all\s+)?previous/gi,
  /forget\s+(all\s+)?previous/gi,
  /new\s+instructions?:/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /user\s*:/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<<SYS>>/gi,
  /<\/SYS>>/gi,
  /you\s+are\s+now/gi,
  /pretend\s+you\s+are/gi,
  /override\s+(all\s+)?rules/gi,
  /bypass\s+(all\s+)?restrictions/gi,
  /```[\s\S]*```/g,
  /<script[\s\S]*<\/script>/gi,
];

function sanitizeDescription(description: string): string {
  if (!description || typeof description !== 'string') {
    return 'Transaction';
  }
  
  let sanitized = description;
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REMOVED]');
  }
  
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }
  
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  return sanitized || 'Transaction';
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAYAPAY BANK DETECTION & PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function detectNayaPay(pdfText: string): boolean {
  const nayapayIndicators = [
    'nayapay',
    'NayaPay',
    'NAYAPAY',
    '(021) 111-222-729',
    'www.nayapay.com',
    'support@nayapay.com',
    'TIME TYPE DESCRIPTION',
    'AMOUNT BALANCE'
  ];
  
  const lowerText = pdfText.toLowerCase();
  let matchCount = 0;
  
  for (const indicator of nayapayIndicators) {
    if (pdfText.includes(indicator) || lowerText.includes(indicator.toLowerCase())) {
      matchCount++;
    }
  }
  
  return matchCount >= 2;
}

function parseNayaPayText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  
  const transactionSections: string[][] = [];
  let currentSection: string[] = [];
  let inTransactionSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for transaction header - with or without spaces
    if (trimmedLine.includes('TIME') && trimmedLine.includes('TYPE') && trimmedLine.includes('DESCRIPTION') && trimmedLine.includes('AMOUNT')) {
      inTransactionSection = true;
      continue;
    }
    
    // End markers for transaction sections
    if (trimmedLine === 'CARRIED FORWARD' || trimmedLine.includes('(021) 111-222-729')) {
      if (currentSection.length > 0) {
        transactionSections.push([...currentSection]);
        currentSection = [];
      }
      inTransactionSection = false;
      continue;
    }
    
    if (inTransactionSection && trimmedLine) {
      currentSection.push(trimmedLine);
    }
  }
  
  if (currentSection.length > 0) {
    transactionSections.push(currentSection);
  }
  
  console.log(`Found ${transactionSections.length} transaction sections`);
  
  for (const section of transactionSections) {
    parseNayaPayTransactionSection(section, transactions);
  }
  
  return transactions;
}

function parseNayaPayTransactionSection(lines: string[], transactions: ParsedTransaction[]): void {
  let i = 0;
  
  while (i < lines.length) {
    const block: string[] = [];
    
    while (i < lines.length) {
      const line = lines[i];
      block.push(line);
      
      if (/Rs\.\s+[\d,]+\.?\d*$/.test(line) || 
          /-?Rs\.\s+[\d,]+\.?\d*Rs\.\s+[\d,]+\.?\d*$/.test(line)) {
        i++;
        break;
      }
      
      i++;
      
      if (block.length > 40) break;
    }
    
    if (block.length > 0) {
      const txn = parseNayaPayTransaction(block);
      if (txn) {
        transactions.push(txn);
      }
    }
  }
}

function parseNayaPayTransaction(lines: string[]): ParsedTransaction | null {
  let date = '';
  let amount = 0;
  let rawDescription = '';
  let feeAmount = 0;
  
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+202\d)/);
    if (dateMatch && !date) {
      date = dateMatch[1];
    }
    
    const feeMatch = line.match(/Fees and Government Taxes Rs\.\s*([\d,]+\.?\d*)/);
    if (feeMatch) {
      feeAmount = Number.parseFloat(feeMatch[1].replace(/,/g, ''));
    }
    
    const amountMatch = line.match(/[-+]?Rs\.\s+([\d,]+\.?\d*)/);
    if (amountMatch && amount === 0) {
      const sign = line.includes('-Rs.') ? -1 : 1;
      const value = Number.parseFloat(amountMatch[1].replace(/,/g, ''));
      amount = sign * value;
    }
    
    // Build description (skip technical junk)
    const skipPatterns = [
      /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+202\d$/,
      /^\d{1,2}:\d{2}\s+(AM|PM)$/,
      /^Transaction ID [a-f0-9]+$/,
      /^United Bank-\d+$/,
      /^Meezan Bank-\d+$/,
      /^easypaisa Bank-\d+$/,
      /^Meezan Bank-\d+$/,
      /^Bank.*-\d+$/,
      /^Visa xxxx\d+$/,
      /^USD \d+$/,
      /^EUR \d+$/,
      /^PKR \d+$/,
      /^Raast (In|Out)$/,
      /^Online Transaction$/,
      /^Online$/,
      /^IBFT (In|Out)$/,
      /^Peer to Peer$/,
      /^Mobile Top-up$/,
      /^VISA Refund Transaction$/,
      /^Reversal$/,
      /^Service Charges Rs\. 0$/,
      /^-?Rs\.\s+[\d,]+\.?\d*$/,
      /^Rs\.\s+[\d,]+\.?\d*$/,
      /^Fees and Government Taxes/,
      /^Transaction$/
    ];
    
    const shouldSkip = skipPatterns.some(pattern => pattern.test(line));
    
    if (!shouldSkip && line.length > 0) {
      // Strip amounts and balances from the line before adding to description
      let cleanLine = line;
      // Remove patterns like "-Rs. 1,500" or "Rs. 10,783.02" from the line
      cleanLine = cleanLine.replace(/-?Rs\.\s+[\d,]+\.?\d*/g, '').trim();
      // Remove extra whitespace
      cleanLine = cleanLine.replace(/\s+/g, ' ').trim();
      
      if (cleanLine.length > 0) {
        rawDescription = rawDescription ? `${rawDescription} ${cleanLine}` : cleanLine;
      }
    }
  }
  
  if (feeAmount > 0 && amount < 0) {
    amount = amount - feeAmount;
  }
  
  if (date && amount !== 0) {
    const parts = date.split(' ');
    const day = parts[0].padStart(2, '0');
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = monthMap[parts[1]];
    const year = parts[2];
    
    // Clean the description to extract only essential information
    const cleanedDescription = cleanNayaPayDescription(rawDescription);
    
    return {
      originalDate: date,
      date: `${year}-${month}-${day}`,
      debit: amount < 0 ? Math.abs(amount) : 0,
      credit: amount > 0 ? amount : 0,
      description: sanitizeDescription(cleanedDescription) || 'Transaction'
    };
  }
  
  return null;
}

/**
 * Clean NayaPay transaction descriptions to show only essential information
 */
function cleanNayaPayDescription(desc: string): string {
  if (!desc || desc.trim().length === 0) {
    return 'Transaction';
  }
  
  let cleaned = desc.trim();
  
  // Pattern 1: Outgoing fund transfer - extract recipient name
  // "Outgoing fund transfer to Muhammad Farhan" → "Transfer to Muhammad Farhan"
  const outgoingTransferMatch = cleaned.match(/(?:Outgoing|outgoing)\s+fund\s+transfer\s+to\s+(.+)/i);
  if (outgoingTransferMatch) {
    return `Transfer to ${outgoingTransferMatch[1].trim()}`;
  }
  
  // Pattern 2: Incoming fund transfer - extract sender name
  // "Incoming fund transfer from Ahmed Abdullah Mujahid" → "Transfer from Ahmed Abdullah"
  const incomingTransferMatch = cleaned.match(/(?:Incoming|incoming)\s+fund\s+transfer\s+from\s+(.+)/i);
  if (incomingTransferMatch) {
    const sender = incomingTransferMatch[1].trim().split(/\s+/).slice(0, 3).join(' '); // Take first 3 words
    return `Transfer from ${sender}`;
  }
  
  // Pattern 3: Paid to merchant - extract merchant name
  // "Paid to VULTR BY CONSTANT WEST PALM BEAUS" → "VULTR"
  // "Paid to NETFLIX.COM Singapore SG" → "Netflix"
  // "Paid to Netflix.com Los Gatos SG" → "Netflix"
  const paidToMatch = cleaned.match(/(?:Paid|paid)\s+to\s+([A-Z0-9.\s]+?)(?:\s+BY\s+|\s+[A-Z][a-z]+\s+[A-Z]{2}|\s*$)/i);
  if (paidToMatch) {
    let merchant = paidToMatch[1].trim();
    
    // Clean up merchant name
    merchant = merchant.replace(/\.COM$/i, '').replace(/\.com$/i, '');
    
    // Take first word if multiple words (e.g., "VULTR BY CONSTANT" → "VULTR")
    const firstWord = merchant.split(/\s+/)[0];
    
    // Capitalize properly
    if (firstWord === firstWord.toUpperCase() && firstWord.length > 2) {
      // If all caps, convert to title case
      merchant = firstWord.charAt(0) + firstWord.slice(1).toLowerCase();
    } else {
      merchant = firstWord;
    }
    
    return merchant;
  }
  
  // Pattern 4: Reversal - show what was reversed
  // "Reversed: Paid to NETFLIX.COM Singapore SG" → "Netflix Refund"
  const reversalMatch = cleaned.match(/Reversed:\s+(?:Paid|paid)\s+to\s+([A-Z0-9.\s]+?)(?:\s+[A-Z][a-z]+\s+[A-Z]{2}|\s*$)/i);
  if (reversalMatch) {
    let merchant = reversalMatch[1].trim();
    merchant = merchant.replace(/\.COM$/i, '').replace(/\.com$/i, '');
    const firstWord = merchant.split(/\s+/)[0];
    
    if (firstWord === firstWord.toUpperCase() && firstWord.length > 2) {
      merchant = firstWord.charAt(0) + firstWord.slice(1).toLowerCase();
    } else {
      merchant = firstWord;
    }
    
    return `${merchant} Refund`;
  }
  
  // Pattern 5: ATM withdrawal
  if (cleaned.toLowerCase().includes('atm') || cleaned.toLowerCase().includes('cash withdrawal')) {
    return 'ATM Withdrawal';
  }
  
  // Pattern 6: Mobile top-up
  if (cleaned.toLowerCase().includes('mobile') && cleaned.toLowerCase().includes('top')) {
    return 'Mobile Top-up';
  }
  
  // Fallback: Take first 3-5 meaningful words
  const words = cleaned.split(/\s+/).filter(w => 
    w.length > 2 && 
    !/^\d+$/.test(w) && 
    !/^[A-Z0-9]{10,}$/.test(w) // Skip long alphanumeric codes
  );
  
  if (words.length > 0) {
    const meaningful = words.slice(0, Math.min(5, words.length)).join(' ');
    return meaningful.length > 50 ? meaningful.substring(0, 50) + '...' : meaningful;
  }
  
  return 'Transaction';
}

function extractNayaPayHeaderTotals(text: string): { expenses: number | null; income: number | null } {
  const totals: { expenses: number | null; income: number | null } = { expenses: null, income: null };
  
  const spentMatch = text.match(/Total\s+Spent[^\d]*Rs\.\s*([\d,]+\.?\d*)/i);
  const incomeMatch = text.match(/Total\s+Income[^\d]*Rs\.\s*([\d,]+\.?\d*)/i);
  
  if (spentMatch) {
    totals.expenses = Number.parseFloat(spentMatch[1].replace(/,/g, ''));
  }
  if (incomeMatch) {
    totals.income = Number.parseFloat(incomeMatch[1].replace(/,/g, ''));
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANK DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function detectBank(pdfText: string): { id: string; config: BankConfig } | null {
  console.log('🔍 Detecting bank...');
  
  if (!pdfText || typeof pdfText !== 'string') {
    return null;
  }
  
  for (const [bankId, bankConfig] of Object.entries(SUPPORTED_BANKS)) {
    if (bankConfig.detect(pdfText)) {
      console.log(`✅ Detected: ${bankConfig.name}`);
      return { id: bankId, config: bankConfig };
    }
  }
  
  return null;
}

function getSupportedBankNames(): string[] {
  return Object.values(SUPPORTED_BANKS).map(bank => bank.name);
}

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

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const items = textContent.items as { str: string; transform: number[] }[];
    
    if (items.length === 0) continue;
    
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
  }
  
  console.log('Extracted PDF text (first 2000 chars):', fullText.substring(0, 2000));
  return fullText;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PARSE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a bank statement with auto-detection
 */
export function parseStatement(pdfText: string): ParseResult {
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
  
  // Step 3: Parse transactions
  console.log(`📊 Parsing ${detectedBank.config.name} statement...`);
  const transactions = detectedBank.config.parse(pdfText);
  console.log(`✅ Parsed ${transactions.length} transactions`);
  
  // Step 4: Validate transactions
  validateTransactions(transactions, detectedBank.config.name);
  
  // Step 5: Calculate summary
  const totalIncome = transactions.reduce((sum, t) => sum + t.credit, 0);
  const totalExpenses = transactions.reduce((sum, t) => sum + t.debit, 0);
  
  return {
    bank: {
      id: detectedBank.id,
      name: detectedBank.config.name
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
 * Parse bank statement text and extract transactions
 * @deprecated Use parseStatement() for better error handling and bank detection
 */
export function parseBankStatement(text: string): ParsedTransaction[] {
  if (!text) return [];
  
  try {
    const result = parseStatement(text);
    return result.transactions;
  } catch (error) {
    console.error('Parse error:', error);
    return [];
  }
}

/**
 * Main function to parse a PDF file and return transactions
 */
export async function parseBankPDF(file: File): Promise<ParsedTransaction[]> {
  const text = await extractTextFromPDF(file);
  const result = parseStatement(text);
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
  const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
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
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      const [dateStr, debitStr, creditStr, ...descParts] = parts;
      const debit = Number.parseFloat(debitStr) || 0;
      const credit = Number.parseFloat(creditStr) || 0;
      const description = descParts.join(',').replace(/^"|"$/g, '').trim();
      
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

export { SUPPORTED_BANKS, getSupportedBankNames, detectBank };
