// Category manager component for UTX
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpenses, Category } from '@/hooks/useExpenses';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onCategoryChange?: () => void;
}

const predefinedColors = [
  '#EF4444', // Red
  '#F97316', // Orange  
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#6B7280', // Gray
];

export const CategoryManager = ({ categories, onCategoryChange }: CategoryManagerProps) => {
  const { addCategory, updateCategory, deleteCategory } = useExpenses();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newCategory, setNewCategory] = useState({ name: '', color: predefinedColors[0] });
  const [editData, setEditData] = useState({ name: '', color: '' });

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await addCategory(newCategory);
    
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
      setNewCategory({ name: '', color: predefinedColors[0] });
      setShowAddForm(false);
      onCategoryChange?.();
    }
    setLoading(false);
  };

  const handleEditCategory = async (id: string) => {
    if (!editData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await updateCategory(id, editData);
    
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
      setEditingId(null);
      onCategoryChange?.();
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      const { error } = await deleteCategory(category.id);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
        onCategoryChange?.();
      }
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditData({ name: category.name, color: category.color });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '', color: '' });
  };

  return (
    <div className="space-y-4">
      {/* Add Category Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Category</CardTitle>
        </CardHeader>
        <CardContent>
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-8 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        newCategory.color === color ? 'border-primary' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddCategory} disabled={loading} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Add
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCategory({ name: '', color: predefinedColors[0] });
                  }}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No categories found</p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  {editingId === category.id ? (
                    // Edit mode
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: editData.color }}
                      />
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1"
                      />
                      <div className="flex gap-1">
                        {predefinedColors.slice(0, 8).map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-full border ${
                              editData.color === color ? 'border-primary border-2' : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditData(prev => ({ ...prev, color }))}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleEditCategory(category.id)}
                          disabled={loading}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCategory(category)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};