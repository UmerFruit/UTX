/**
 * NayaPay Bank Parser
 * 
 * Parses NayaPay bank statement PDFs and extracts transaction data.
 */

import { ParsedTransaction } from './types.ts';

export function detectNayaPay(pdfText: string): boolean {
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

export function parseNayaPayText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  
  const transactionSections: string[][] = [];
  let currentSection: string[] = [];
  let inTransactionSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('TIME') && trimmedLine.includes('TYPE') && trimmedLine.includes('DESCRIPTION') && trimmedLine.includes('AMOUNT')) {
      inTransactionSection = true;
      continue;
    }
    
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

function getNextTransactionBlock(lines: string[], startIndex: number): { block: string[]; nextIndex: number } {
  const block: string[] = [];
  let i = startIndex;
  
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
  
  return { block, nextIndex: i };
}

function parseNayaPayTransactionSection(lines: string[], transactions: ParsedTransaction[]): void {
  let i = 0;
  
  while (i < lines.length) {
    const { block, nextIndex } = getNextTransactionBlock(lines, i);
    i = nextIndex;
    
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
      return Number.parseFloat(feeMatch[1].replaceAll(',', ''));
    }
  }
  return 0;
}

function extractAmount(lines: string[]): number {
  for (const line of lines) {
    const amountMatch = /[-+]?Rs\.\s+([\d,]+\.?\d*)/.exec(line);
    if (amountMatch) {
      const sign = line.includes('-Rs.') ? -1 : 1;
      const value = Number.parseFloat(amountMatch[1].replaceAll(',', ''));
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
      let cleanLine = line.replaceAll(/-?Rs\.\s+[\d,]+\.?\d*/g, '').trim();
      cleanLine = cleanLine.replaceAll(/\s+/g, ' ').trim();
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
      description: cleanedDescription || 'Transaction'
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
  merchant = merchant.replaceAll(/\.com$/gi, '');
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

function cleanNayaPayDescription(desc: string): string {
  if (!desc || desc.trim().length === 0) {
    return 'Transaction';
  }
  
  let cleaned = desc.trim();
  
  cleaned = cleaned.replaceAll(/\([^@]+@[^)]+\)/g, '');
  cleaned = cleaned.replaceAll(/NayaPay\s+xxxx\d+/g, '').replaceAll(/nayapay\s+xxxx\d+/g, '');
  cleaned = cleaned.replaceAll(/\s+/g, ' ').trim();
  
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
