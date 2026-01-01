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
  
  sanitized = sanitized.replaceAll(/\s+/, ' ').trim();
  
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }
  
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replaceAll(/[\x00-\x1F\x7F]/, '');
  
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

function extractDate(lines: string[]): string {
  for (const line of lines) {
    const dateMatch = /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+202\d)/.exec(line);
    if (dateMatch) {
      return dateMatch[1];
    }
  }
  return '';
}

function extractFee(lines: string[]): number {
  for (const line of lines) {
    const feeMatch = /Fees and Government Taxes Rs\.\s*([\d,]+\.?\d*)/.exec(line);
    if (feeMatch) {
      return Number.parseFloat(feeMatch[1].replaceAll(/,/, ''));
    }
  }
  return 0;
}

function extractAmount(lines: string[]): number {
  for (const line of lines) {
    const amountMatch = /[-+]?Rs\.\s+([\d,]+\.?\d*)/.exec(line);
    if (amountMatch) {
      const sign = line.includes('-Rs.') ? -1 : 1;
      const value = Number.parseFloat(amountMatch[1].replaceAll(/,/, ''));
      return sign * value;
    }
  }
  return 0;
}

function buildDescription(lines: string[]): string {
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

  let rawDescription = '';
  for (const line of lines) {
    const shouldSkip = skipPatterns.some(pattern => pattern.test(line));
    if (!shouldSkip && line.length > 0) {
      let cleanLine = line.replaceAll(/-?Rs\.\s+[\d,]+\.?\d*/, '').trim();
      cleanLine = cleanLine.replaceAll(/\s+/, ' ').trim();
      if (cleanLine.length > 0) {
        rawDescription = rawDescription ? `${rawDescription} ${cleanLine}` : cleanLine;
      }
    }
  }
  return rawDescription;
}

function parseNayaPayTransaction(lines: string[]): ParsedTransaction | null {
  const date = extractDate(lines);
  const feeAmount = extractFee(lines);
  const amount = extractAmount(lines);
  const rawDescription = buildDescription(lines);

  let adjustedAmount = amount;
  if (feeAmount > 0 && amount < 0) {
    adjustedAmount = amount - feeAmount;
  }

  if (date && adjustedAmount !== 0) {
    const parts = date.split(' ');
    const day = parts[0].padStart(2, '0');
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = monthMap[parts[1]];
    const year = parts[2];

    const cleanedDescription = cleanNayaPayDescription(rawDescription);

    return {
      originalDate: date,
      date: `${year}-${month}-${day}`,
      debit: adjustedAmount < 0 ? Math.abs(adjustedAmount) : 0,
      credit: Math.max(adjustedAmount, 0),
      description: sanitizeDescription(cleanedDescription) || 'Transaction'
    };
  }

  return null;
}

function formatName(name: string): string {
  if (name === name.toUpperCase() && name.length > 3) {
    return name.split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  return name;
}

function cleanMerchantName(merchant: string): string {
  merchant = merchant.replace(/\.COM$/i, '').replace(/\.com$/i, '');
  const firstWord = merchant.split(/\s+/)[0];
  return formatName(firstWord);
}

function cleanMoneyReceived(cleaned: string): string | null {
  const match = /Money\s+received\s+from\s+(.+)/i.exec(cleaned);
  if (match) {
    return `Received from ${formatName(match[1].trim())}`;
  }
  return null;
}

function cleanMoneySent(cleaned: string): string | null {
  const match = /Money\s+sent\s+to\s+(.+)/i.exec(cleaned);
  if (match) {
    return `Sent to ${formatName(match[1].trim())}`;
  }
  return null;
}

function cleanOutgoingTransfer(cleaned: string): string | null {
  const match = /(?:Outgoing|outgoing)\s+fund\s+transfer\s+to\s+(.+)/i.exec(cleaned);
  if (match) {
    return `Transfer to ${match[1].trim()}`;
  }
  return null;
}

function cleanIncomingTransfer(cleaned: string): string | null {
  const match = /(?:Incoming|incoming)\s+fund\s+transfer\s+from\s+(.+)/i.exec(cleaned);
  if (match) {
    const sender = match[1].trim().split(/\s+/).slice(0, 3).join(' ');
    return `Transfer from ${sender}`;
  }
  return null;
}

function cleanPaidTo(cleaned: string): string | null {
  const match = /(?:Paid|paid)\s+to\s+([A-Z0-9.\s]+?)(?:\s+BY\s+|\s*$)/i.exec(cleaned);
  if (match) {
    return cleanMerchantName(match[1].trim());
  }
  return null;
}

function cleanReversal(cleaned: string): string | null {
  const match = /Reversed:\s+(?:Paid|paid)\s+to\s+([A-Z0-9.\s]+?)(?:\s+[A-Z][a-z]+\s+[A-Z]{2}|\s*$)/i.exec(cleaned);
  if (match) {
    return `${cleanMerchantName(match[1].trim())} Refund`;
  }
  return null;
}

function cleanSpecialCases(cleaned: string): string | null {
  const lower = cleaned.toLowerCase();
  if (lower.includes('atm') || lower.includes('cash withdrawal')) {
    return 'ATM Withdrawal';
  }
  if (lower.includes('mobile') && lower.includes('top')) {
    return 'Mobile Top-up';
  }
  return null;
}

function cleanFallback(cleaned: string): string {
  const words = cleaned.split(/\s+/).filter(w => 
    w.length > 2 && 
    !/^\d+$/.test(w) && 
    !/^[A-Z0-9]{10,}$/.test(w)
  );
  if (words.length > 0) {
    const meaningful = words.slice(0, Math.min(5, words.length)).join(' ');
    return meaningful.length > 50 ? meaningful.substring(0, 50) + '...' : meaningful;
  }
  return 'Transaction';
}

/**
 * Clean NayaPay transaction descriptions to show only essential information
 */
function cleanNayaPayDescription(desc: string): string {
  if (!desc || desc.trim().length === 0) {
    return 'Transaction';
  }
  
  let cleaned = desc.trim();
  
  // Remove email addresses and account numbers from the description
  cleaned = cleaned.replaceAll(/\([^@]+@[^)]+\)/, '');
  cleaned = cleaned.replaceAll(/NayaPay\s+xxxx\d+/, '').replaceAll(/nayapay\s+xxxx\d+/, '');
  cleaned = cleaned.replaceAll(/\s+/, ' ').trim();
  
  // Try each pattern in order
  const patterns = [
    cleanMoneyReceived,
    cleanMoneySent,
    cleanOutgoingTransfer,
    cleanIncomingTransfer,
    cleanPaidTo,
    cleanReversal,
    cleanSpecialCases
  ];
  
  for (const pattern of patterns) {
    const result = pattern(cleaned);
    if (result) {
      return result;
    }
  }
  
  return cleanFallback(cleaned);
}

function extractNayaPayHeaderTotals(text: string): { expenses: number | null; income: number | null } {
  const totals: { expenses: number | null; income: number | null } = { expenses: null, income: null };
  
  const spentMatch = /Total\s+Spent[^\d]*Rs\.\s*([\d,]+\.?\d*)/i.exec(text);
  const incomeMatch = /Total\s+Income[^\d]*Rs\.\s*([\d,]+\.?\d*)/i.exec(text);
  
  if (spentMatch) {
    totals.expenses = Number.parseFloat(spentMatch[1].replaceAll(/,/, ''));
  }
  if (incomeMatch) {
    totals.income = Number.parseFloat(incomeMatch[1].replaceAll(/,/, ''));
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
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      const [dateStr, debitStr, creditStr, ...descParts] = parts;
      const debit = Number.parseFloat(debitStr) || 0;
      const credit = Number.parseFloat(creditStr) || 0;
      const description = descParts.join(',').replaceAll(/^"$/, '').trim();
      
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
