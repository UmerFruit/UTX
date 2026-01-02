import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Tag, Loader2, Edit } from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CategoryType = 'income' | 'expense' | 'both';

// Color picker component to ensure perfect circles
const ColorPicker = ({ 
  selectedColor, 
  onSelectColor,
  predefinedColors
}: { 
  selectedColor: string; 
  onSelectColor: (color: string) => void;
  predefinedColors: string[];
}) => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(6, 1fr)', 
    gap: '10px',
    justifyItems: 'center'
  }}>
    {predefinedColors.map((color) => (
      <button
        key={color}
        type="button"
        data-color-picker="true"
        onClick={() => onSelectColor(color)}
        aria-label={`Select color ${color}`}
        aria-pressed={selectedColor === color}
        style={{
          width: 28,
          height: 28,
          padding: 0,
          margin: 0,
          backgroundColor: color,
          borderRadius: '50%',
          border: selectedColor === color ? '3px solid #3b82f6' : '2px solid #d1d5db',
          cursor: 'pointer',
          outline: 'none',
          display: 'inline-block',
          boxSizing: 'content-box',
          transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.15s ease, border 0.15s ease',
          minHeight: 'unset',
        }}
      />
    ))}
  </div>
);

// Color dot indicator for category cards
const ColorDot = ({ color }: { color: string }) => (
  <span
    style={{
      display: 'inline-block',
      width: 16,
      height: 16,
      backgroundColor: color,
      borderRadius: '50%',
      border: '1px solid #d1d5db',
      flexShrink: 0,
    }}
  />
);

const Categories = () => {
  const { user, loading: authLoading } = useAuth();
  const { categories, addCategory, updateCategory, deleteCategory, loading: categoriesLoading } = useCategories();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#EF4444');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('both');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#EF4444');
  const [editCategoryType, setEditCategoryType] = useState<CategoryType>('both');

  const predefinedColors = [
    '#EF4444', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#06B6D4', '#6366F1',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280'
  ];

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await addCategory({
      name: newCategoryName.trim(),
      color: newCategoryColor,
      type: newCategoryType,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      setNewCategoryName('');
      setNewCategoryColor('#EF4444');
      setNewCategoryType('both');
      setShowAddDialog(false);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setDeletingId(id);
    const { error } = await deleteCategory(id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Category "${name}" deleted successfully`,
      });
    }
    setDeletingId(null);
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
    setEditCategoryType((category.type as CategoryType) || 'both');
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;
    
    if (!editCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await updateCategory(editingCategory.id, {
      name: editCategoryName.trim(),
      color: editCategoryColor,
      type: editCategoryType,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setEditingCategory(null);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Tag className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Categories</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Manage your expense categories</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => `category-loading-skeleton-${i}`).map((key) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-muted rounded-full"></div>
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Tag className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Categories</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage your expense categories</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Add Category Card */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-dashed border-2 border-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
                        <p className="text-sm text-primary">Add Category</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      placeholder="Enter category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <ColorPicker 
                      selectedColor={newCategoryColor} 
                      onSelectColor={setNewCategoryColor}
                      predefinedColors={predefinedColors}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newCategoryType} onValueChange={(value: CategoryType) => setNewCategoryType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both (Income & Expense)</SelectItem>
                        <SelectItem value="income">Income Only</SelectItem>
                        <SelectItem value="expense">Expense Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewCategoryName('');
                        setNewCategoryColor('#EF4444');
                        setNewCategoryType('both');
                        setShowAddDialog(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddCategory} disabled={loading}>
                      {loading ? 'Adding...' : 'Add Category'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Expense Categories */}
          {(() => {
            const expenseCategories = categories.filter(cat => cat.type === 'expense');
            if (expenseCategories.length === 0) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-red-500 rounded-full"></div>
                  <h2 className="text-xl font-semibold text-red-700">Expense Categories</h2>
                  <span className="text-sm text-muted-foreground">({expenseCategories.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {expenseCategories.map((category) => (
                    <Card key={category.id} className="relative group hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ColorDot color={category.color} />
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStartEdit(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              disabled={deletingId === category.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Income Categories */}
          {(() => {
            const incomeCategories = categories.filter(cat => cat.type === 'income');
            if (incomeCategories.length === 0) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-green-500 rounded-full"></div>
                  <h2 className="text-xl font-semibold text-green-700">Income Categories</h2>
                  <span className="text-sm text-muted-foreground">({incomeCategories.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {incomeCategories.map((category) => (
                    <Card key={category.id} className="relative group hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ColorDot color={category.color} />
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStartEdit(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              disabled={deletingId === category.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* General Categories (Both) */}
          {(() => {
            const generalCategories = categories.filter(cat => cat.type === 'both' || !cat.type);
            if (generalCategories.length === 0) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                  <h2 className="text-xl font-semibold text-blue-700">General Categories</h2>
                  <span className="text-sm text-muted-foreground">({generalCategories.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {generalCategories.map((category) => (
                    <Card key={category.id} className="relative group hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ColorDot color={category.color} />
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStartEdit(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              disabled={deletingId === category.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first category to start organizing your expenses.
            </p>
          </div>
        )}

        {/* Edit Category Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Category Name</Label>
                <Input
                  id="edit-category-name"
                  placeholder="Enter category name"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker 
                  selectedColor={editCategoryColor} 
                  onSelectColor={setEditCategoryColor}
                  predefinedColors={predefinedColors}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editCategoryType} onValueChange={(value: CategoryType) => setEditCategoryType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both (Income & Expense)</SelectItem>
                    <SelectItem value="income">Income Only</SelectItem>
                    <SelectItem value="expense">Expense Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleEditCategory} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Categories;
