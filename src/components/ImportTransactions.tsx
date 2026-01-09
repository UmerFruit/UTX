// Import Transactions Component
// Allows users to import bank statements from PDF or CSV files
// Now works as a standalone page component with improved mobile layout

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CategorySelectWithCreate } from '@/components/CategorySelectWithCreate';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { parseBankPDF, parseCSVFile, ParsedTransaction, convertToImportFormat, ImportTransaction } from '@/utils/pdfParser';
import { formatCurrency } from '@/utils/dateUtils';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// No props interface needed - component doesn't accept props

interface PreviewTransaction extends ImportTransaction {
  id: string;
  selected: boolean;
  expanded?: boolean;
}

export const ImportTransactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewTransaction[]>([]);
  const [fullPreview, setFullPreview] = useState<PreviewTransaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importStats, setImportStats] = useState<{ success: number; failed: number } | null>(null);
  const [filterTerms, setFilterTerms] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      const previewData: PreviewTransaction[] = importTransactions.map((t, index) => ({
        ...t,
        id: `import-${index}-${Date.now()}`,
        selected: true,
        expanded: false,
      }));

      setFullPreview(previewData);
      setPreview(previewData);
      setCurrentPage(1);
      
      toast({
        title: 'File Parsed Successfully',
        description: `Found ${parsedTransactions.length} transactions ready for import.`,
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

  const toggleExpanded = (id: string) => {
    setPreview(prev => prev.map(t => 
      t.id === id ? { ...t, expanded: !t.expanded } : t
    ));
  };

  const toggleAll = (selected: boolean) => {
    setPreview(prev => prev.map(t => ({ ...t, selected })));
  };

  const applyFilterTerms = (terms: string) => {
    setFilterTerms(terms);
    
    if (!terms.trim()) {
      setPreview(fullPreview);
      return;
    }

    const filterArray = terms.split(',').map(term => term.trim().toLowerCase()).filter(t => t.length > 0);
    const filtered = fullPreview.filter(t => {
      const desc = t.description.toLowerCase();
      return !filterArray.some(term => desc.includes(term));
    });
    
    setPreview(filtered);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return (
      <>
        <Upload className="mr-2 h-4 w-4" />
        Select File
      </>
    );
  };

  const resetImport = () => {
    setPreview([]);
    setFullPreview([]);
    setFileName('');
    setImportStats(null);
    setImportProgress(0);
    setFilterTerms('');
    setCurrentPage(1);
  };

  const selectedCount = preview.filter(t => t.selected).length;
  const totalExpenses = preview.filter(t => t.selected && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = preview.filter(t => t.selected && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

  // Pagination logic
  const totalPages = Math.ceil(preview.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPreview = preview.slice(startIndex, endIndex);

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="h-5 w-5" />
            Upload File
          </CardTitle>
          <CardDescription>
            Upload a PDF or CSV bank statement to import transactions automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <Label htmlFor="file-upload" className="sr-only">Upload File</Label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".pdf,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading || isImporting}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isImporting}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {getButtonContent()}
                </Button>
                {fileName && (
                  <p className="text-sm text-muted-foreground mt-2 truncate">
                    <FileText className="inline h-4 w-4 mr-1" />
                    {fileName}
                  </p>
                )}
              </div>
              {preview.length > 0 && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={resetImport} 
                  disabled={isImporting}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Supported formats:</strong> PDF (bank statement), CSV (Date, Debit, Credit)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {isImporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing transactions...</span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Stats */}
      {importStats && (
        <Card className={importStats.failed > 0 ? 'border-yellow-500' : 'border-green-500'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {importStats.failed === 0 ? (
                <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-500 shrink-0" />
              )}
              <div>
                <p className="font-medium text-base sm:text-lg">Import Complete</p>
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
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Transaction Preview</CardTitle>
              <CardDescription>
                Review and categorize transactions before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Terms */}
              <div className="space-y-2">
                <Label htmlFor="filter-terms" className="text-sm font-medium">
                  Filter Terms (Optional)
                </Label>
                <Input
                  id="filter-terms"
                  type="text"
                  placeholder="e.g., Umer Farooq, John Doe (comma separated)"
                  value={filterTerms}
                  onChange={(e) => applyFilterTerms(e.target.value)}
                  disabled={isImporting}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Transactions containing these terms will be excluded. Useful for filtering transfers to your own accounts.
                  {filterTerms && fullPreview.length > preview.length && (
                    <span className="text-orange-600 font-medium block mt-1">
                      ⚠️ {fullPreview.length - preview.length} transaction(s) filtered out
                    </span>
                  )}
                </p>
              </div>

              {/* Summary Stats */}
              <div className="flex flex-wrap gap-3 sm:gap-4 items-center pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedCount === preview.length}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    {selectedCount} of {preview.length} selected
                  </Label>
                </div>
                <Badge variant="destructive" className="gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1">
                  Expenses: {formatCurrency(totalExpenses)}
                </Badge>
                <Badge variant="default" className="gap-1 bg-green-600 text-xs sm:text-sm px-2 sm:px-3 py-1">
                  Income: {formatCurrency(totalIncome)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Transaction List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">
              Transactions ({preview.length})
            </h3>
            <div className="space-y-3">
              {paginatedPreview.map((transaction) => (
                <Card 
                  key={transaction.id} 
                  className={`transition-all duration-200 ${transaction.selected ? 'border-primary/50' : 'opacity-60'}`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3">
                      {/* Checkbox */}
                      <Checkbox
                        checked={transaction.selected}
                        onCheckedChange={() => toggleTransaction(transaction.id)}
                        className="mt-1 shrink-0"
                      />
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            variant={transaction.type === 'expense' ? 'destructive' : 'default'} 
                            className={`text-xs ${transaction.type === 'income' ? 'bg-green-600' : ''}`}
                          >
                            {transaction.type === 'expense' ? 'Expense' : 'Income'}
                          </Badge>
                          <span className="text-sm sm:text-base font-semibold">
                            {formatCurrency(transaction.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {transaction.date}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          {transaction.description.length > 80 && !transaction.expanded ? (
                            <button
                              onClick={() => toggleExpanded(transaction.id)}
                              className="text-xs text-muted-foreground hover:text-foreground text-left w-full group transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <span className="flex-1 break-words">
                                  {transaction.description.substring(0, 80)}...
                                </span>
                                <ChevronDown className="h-3 w-3 mt-0.5 shrink-0 opacity-50 group-hover:opacity-100" />
                              </div>
                            </button>
                          ) : (
                            <div>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                                {transaction.description}
                              </p>
                              {transaction.description.length > 80 && transaction.expanded && (
                                <button
                                  onClick={() => toggleExpanded(transaction.id)}
                                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1 transition-colors"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                  Show less
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Category Selector - With improved spacing */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          <div className="relative z-10">
                            <CategorySelectWithCreate
                              value={transaction.category_id || ''}
                              onValueChange={(value) => updateCategory(transaction.id, value || null)}
                              placeholder="Select or create category"
                              defaultCategoryType={transaction.type === 'expense' ? 'expense' : 'income'}
                              showTypeSelector={true}
                              filterByType={transaction.type === 'expense' ? 'expense' : 'income'}
                              triggerClassName="h-9 text-sm w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 self-start"
                        onClick={() => removeTransaction(transaction.id)}
                        disabled={isImporting}
                      >
                        <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
          {preview.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, preview.length)} of {preview.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Import Button - Fixed at bottom */}
          <Card className="sticky bottom-0 z-20 shadow-lg border-2">
            <CardContent className="p-4">
              <Button 
                onClick={handleImport} 
                disabled={isImporting || selectedCount === 0}
                size="lg"
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Importing {importProgress}%...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Import {selectedCount} Transaction{selectedCount === 1 ? '' : 's'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ImportTransactions;
