// Import Transactions Component
// Allows users to import bank statements from PDF or CSV files

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/hooks/useExpenses';
import { parseBankPDF, parseCSVFile, ParsedTransaction, convertToImportFormat, ImportTransaction } from '@/utils/pdfParser';
import { formatCurrency } from '@/utils/dateUtils';
import { cleanDescriptionsWithGroq } from '@/utils/groqCleaner';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertCircle, Trash2, Sparkles } from 'lucide-react';

interface ImportTransactionsProps {
  categories: Category[];
  onImportComplete: () => void;
}

interface PreviewTransaction extends ImportTransaction {
  id: string;
  selected: boolean;
  originalDescription: string;
}

export const ImportTransactions = ({ categories, onImportComplete }: ImportTransactionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewTransaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importStats, setImportStats] = useState<{ success: number; failed: number } | null>(null);

  // Filter categories for expenses and income
  const expenseCategories = categories.filter(cat => !cat.type || cat.type === 'expense' || cat.type === 'both');
  const incomeCategories = categories.filter(cat => !cat.type || cat.type === 'income' || cat.type === 'both');

  const cleanDescriptionsWithAI = async (transactions: PreviewTransaction[]) => {
    setIsCleaning(true);
    try {
      const descriptions = transactions.map(t => t.originalDescription);
      const cleanedDescriptions = await cleanDescriptionsWithGroq(descriptions);
      
      // Update preview with cleaned descriptions
      return transactions.map((t, index) => ({
        ...t,
        description: cleanedDescriptions[index] || t.description,
      }));
    } catch (error) {
      console.error('AI cleaning error:', error);
      toast({
        title: 'AI Cleaning Failed',
        description: error instanceof Error ? error.message : 'Failed to clean descriptions with AI',
        variant: 'destructive',
      });
      // Return original transactions if cleaning fails
      return transactions;
    } finally {
      setIsCleaning(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setImportStats(null);

    try {
      let parsedTransactions: ParsedTransaction[];
      
      if (file.name.toLowerCase().endsWith('.pdf')) {
        parsedTransactions = await parseBankPDF(file);
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        parsedTransactions = await parseCSVFile(file);
      } else {
        throw new Error('Unsupported file format. Please upload a PDF or CSV file.');
      }

      if (parsedTransactions.length === 0) {
        toast({
          title: 'No Transactions Found',
          description: 'Could not find any transactions in the uploaded file. Make sure it\'s a valid bank statement.',
          variant: 'destructive',
        });
        setPreview([]);
        return;
      }

      // Convert to preview format with unique IDs
      const importTransactions = convertToImportFormat(parsedTransactions);
      let previewData: PreviewTransaction[] = importTransactions.map((t, index) => ({
        ...t,
        id: `import-${index}-${Date.now()}`,
        selected: true,
        originalDescription: parsedTransactions[index].description || 'No description',
      }));

      // Always apply AI cleaning following main.js pipeline
      toast({
        title: 'Cleaning Descriptions...',
        description: 'AI is enhancing transaction descriptions. This may take a moment.',
      });
      previewData = await cleanDescriptionsWithAI(previewData);

      setPreview(previewData);
      
      toast({
        title: 'File Parsed Successfully',
        description: `Found ${parsedTransactions.length} transactions ready for import. AI cleaning applied.`,
      });
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: 'Parse Error',
        description: error instanceof Error ? error.message : 'Failed to parse the file. Please try again.',
        variant: 'destructive',
      });
      setPreview([]);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleTransaction = (id: string) => {
    setPreview(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  const toggleAll = (selected: boolean) => {
    setPreview(prev => prev.map(t => ({ ...t, selected })));
  };

  const updateCategory = (id: string, categoryId: string | null) => {
    setPreview(prev => prev.map(t =>
      t.id === id ? { ...t, category_id: categoryId } : t
    ));
  };

  const removeTransaction = (id: string) => {
    setPreview(prev => prev.filter(t => t.id !== id));
  };

  const validateImport = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to import transactions.',
        variant: 'destructive',
      });
      return false;
    }

    const selectedTransactions = preview.filter(t => t.selected);

    if (selectedTransactions.length === 0) {
      toast({
        title: 'No Transactions Selected',
        description: 'Please select at least one transaction to import.',
        variant: 'destructive',
      });
      return false;
    }

    return selectedTransactions;
  };

  const importBatch = async (records: any[], tableName: 'expenses' | 'income', totalTransactions: number, processedRef: { current: number }) => {
    let successCount = 0;
    let failCount = 0;

    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);

      if (error) {
        console.error(`${tableName} insert error:`, error);
        failCount += batch.length;
      } else {
        successCount += batch.length;
      }

      processedRef.current += batch.length;
      setImportProgress(Math.round((processedRef.current / totalTransactions) * 100));
    }

    return { successCount, failCount };
  };

  const handleImportResult = (successCount: number, failCount: number) => {
    setImportStats({ success: successCount, failed: failCount });
    setIsImporting(false);

    if (successCount > 0) {
      const description = `Successfully imported ${successCount} transaction${successCount === 1 ? '' : 's'}` + (failCount > 0 ? `, ${failCount} failed` : '');
      toast({
        title: 'Import Complete',
        description,
      });

      // Clear preview after successful import
      setPreview([]);
      setFileName('');
      onImportComplete();
    } else {
      toast({
        title: 'Import Failed',
        description: 'Failed to import transactions. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    const selectedTransactions = validateImport();
    if (!selectedTransactions) return;

    setIsImporting(true);
    setImportProgress(0);

    // Split transactions by type
    const expenses = selectedTransactions.filter(t => t.type === 'expense');
    const income = selectedTransactions.filter(t => t.type === 'income');

    const totalTransactions = selectedTransactions.length;
    const processedRef = { current: 0 };

    let totalSuccess = 0;
    let totalFail = 0;

    // Import expenses
    if (expenses.length > 0) {
      const expenseRecords = expenses.map(t => ({
        amount: t.amount,
        category_id: t.category_id,
        date: t.date,
        description: t.description || 'Imported from bank statement',
        user_id: user.id,
      }));

      const { successCount, failCount } = await importBatch(expenseRecords, 'expenses', totalTransactions, processedRef);
      totalSuccess += successCount;
      totalFail += failCount;
    }

    // Import income
    if (income.length > 0) {
      const incomeRecords = income.map(t => ({
        amount: t.amount,
        category_id: t.category_id,
        date: t.date,
        description: t.description || 'Imported from bank statement',
        user_id: user.id,
        is_recurring: false,
        recurring_period: null,
      }));

      const { successCount, failCount } = await importBatch(incomeRecords, 'income', totalTransactions, processedRef);
      totalSuccess += successCount;
      totalFail += failCount;
    }

    handleImportResult(totalSuccess, totalFail);
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Parsing...
        </>
      );
    }
    if (isCleaning) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cleaning...
        </>
      );
    }
    return (
      <>
        <Upload className="mr-2 h-4 w-4" />
        Select File
      </>
    );
  };

  const resetImport = () => {
    setPreview([]);
    setFileName('');
    setImportStats(null);
    setImportProgress(0);
  };

  const selectedCount = preview.filter(t => t.selected).length;
  const totalExpenses = preview.filter(t => t.selected && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = preview.filter(t => t.selected && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Import</span>
          <span className="xs:hidden">Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Bank Statement
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or CSV bank statement to import transactions automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* File Upload Section */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <Label htmlFor="file-upload" className="sr-only">Upload File</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        type="file"
                        accept=".pdf,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isLoading || isImporting || isCleaning}
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isImporting || isCleaning}
                        className="w-full sm:w-auto"
                      >
                        {getButtonContent()}
                      </Button>
                      {fileName && (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {fileName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported formats: PDF (bank statement), CSV (Date, Debit, Credit)
                    </p>
                  </div>
                  {preview.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetImport} disabled={isImporting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Progress */}
          {isImporting && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing transactions...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Stats */}
          {importStats && (
            <Card className={importStats.failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  {importStats.failed === 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">Import Complete</p>
                    <p className="text-sm text-muted-foreground">
                      {importStats.success} imported successfully
                      {importStats.failed > 0 && `, ${importStats.failed} failed`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Section */}
          {preview.length > 0 && (
            <>
              {/* Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>
                    Review and categorize transactions before importing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedCount === preview.length}
                        onCheckedChange={(checked) => toggleAll(!!checked)}
                      />
                      <Label htmlFor="select-all">
                        {selectedCount} of {preview.length} selected
                      </Label>
                    </div>
                    <Badge variant="destructive" className="gap-1">
                      Expenses: {formatCurrency(totalExpenses)}
                    </Badge>
                    <Badge variant="default" className="gap-1 bg-green-600">
                      Income: {formatCurrency(totalIncome)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {preview.map((transaction) => (
                  <Card 
                    key={transaction.id} 
                    className={`transition-opacity ${transaction.selected ? '' : 'opacity-50'}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={transaction.selected}
                          onCheckedChange={() => toggleTransaction(transaction.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'} 
                                   className={transaction.type === 'income' ? 'bg-green-600' : ''}>
                              {transaction.type === 'expense' ? 'Expense' : 'Income'}
                            </Badge>
                            <span className="text-sm font-medium">
                              {formatCurrency(transaction.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {transaction.date}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate" title={transaction.originalDescription}>
                            {transaction.originalDescription}
                          </p>
                          {transaction.description !== transaction.originalDescription && (
                            <div className="flex items-center gap-2 text-xs">
                              <Sparkles className="h-3 w-3 text-yellow-500" />
                              <span className="font-medium text-foreground">
                                {transaction.description}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Label className="text-xs shrink-0">Category:</Label>
                            <Select
                              value={transaction.category_id || 'none'}
                              onValueChange={(value) => updateCategory(transaction.id, value === 'none' ? null : value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Category</SelectItem>
                                {(transaction.type === 'expense' ? expenseCategories : incomeCategories).map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: cat.color }} 
                                      />
                                      {cat.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeTransaction(transaction.id)}
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {preview.length > 0 && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || selectedCount === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Import {selectedCount} Transaction{selectedCount === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportTransactions;
