import { DashboardLayout } from '@/components/layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type MenuItemRow = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  wholesale_price: string | null;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  // Stored as JSON in the DB; allow any here for flexibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ingredients: any;
};

type MenuItemInput = Omit<MenuItemRow, 'ingredients'> & {
  ingredients: string;
};

const emptyMenuItemInput = (): MenuItemInput => ({
  id: 0,
  name: '',
  description: '',
  price: '',
  wholesale_price: '',
  category: '',
  image_url: '',
  is_available: true,
  is_popular: false,
  sort_order: 0,
  ingredients: '',
});

async function nextMenuId(): Promise<number> {
  const { data, error } = await supabase
    .from('menu')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxId = data?.[0]?.id ?? 0;
  return Number(maxId) + 1;
}

export function Menu() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MenuItemInput>(emptyMenuItemInput());

  const [deleteTarget, setDeleteTarget] = useState<MenuItemRow | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadItems = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('menu')
        .select(
          'id, name, description, price, wholesale_price, category, image_url, is_available, is_popular, sort_order, ingredients',
        )
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setItems((data ?? []) as MenuItemRow[]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load menu items.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadItems();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [items, search, categoryFilter]);

  const openCreate = async () => {
    try {
      const id = await nextMenuId();
      setEditingId(null);
      setForm({
        ...emptyMenuItemInput(),
        id,
      });
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not prepare new menu item.',
      );
    }
  };

  const openEdit = (item: MenuItemRow) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      wholesale_price: item.wholesale_price ?? '',
      category: item.category,
      image_url: item.image_url ?? '',
      is_available: item.is_available,
      is_popular: item.is_popular,
      sort_order: item.sort_order,
      ingredients:
        typeof item.ingredients === 'string'
          ? item.ingredients
          : JSON.stringify(item.ingredients ?? '', null, 2),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      toast.error('Price must be a valid number.');
      return;
    }
    if (!form.category.trim()) {
      toast.error('Category is required.');
      return;
    }

    let ingredientsValue: unknown = null;
    if (form.ingredients.trim()) {
      try {
        ingredientsValue = JSON.parse(form.ingredients);
      } catch {
        toast.error('Ingredients must be valid JSON (or left empty).');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: MenuItemRow = {
        id: form.id,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: String(form.price),
        wholesale_price: form.wholesale_price?.trim() || null,
        category: form.category.trim(),
        image_url: form.image_url?.trim() || null,
        is_available: form.is_available,
        is_popular: form.is_popular,
        sort_order: Number(form.sort_order) || 0,
        ingredients: ingredientsValue,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('menu')
          .update({
            name: payload.name,
            description: payload.description,
            price: payload.price,
            wholesale_price: payload.wholesale_price,
            category: payload.category,
            image_url: payload.image_url,
            is_available: payload.is_available,
            is_popular: payload.is_popular,
            sort_order: payload.sort_order,
            ingredients: payload.ingredients,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Menu item updated.');
      } else {
        const { error: insertError } = await supabase.from('menu').insert({
          id: payload.id,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          wholesale_price: payload.wholesale_price,
          category: payload.category,
          image_url: payload.image_url,
          is_available: payload.is_available,
          is_popular: payload.is_popular,
          sort_order: payload.sort_order,
          ingredients: payload.ingredients,
        });

        if (insertError) throw insertError;
        toast.success('Menu item created.');
      }

      setDialogOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save menu item.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('menu')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Menu item deleted.');
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete menu item.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Menu">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Menu">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage the menu.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Menu">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Menu items</CardTitle>
              <CardDescription>
                Manage items shown on the public menu.
              </CardDescription>
            </div>
            <Button onClick={() => void openCreate()} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search by name, description or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="category-filter" className="whitespace-nowrap">
                  Category
                </Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value)}
                >
                  <SelectTrigger id="category-filter" className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No menu items found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Wholesale
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Popular
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Available
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Sort
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {item.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          ${Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.wholesale_price
                            ? `$${Number(item.wholesale_price).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={item.is_popular ? 'default' : 'secondary'}
                          >
                            {item.is_popular ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={item.is_available ? 'default' : 'secondary'}
                          >
                            {item.is_available ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.sort_order}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? 'Edit menu item' : 'Add menu item'}
            </DialogTitle>
            <DialogDescription>
              Items marked as available appear on the public menu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="menu-id">ID</Label>
              <Input
                id="menu-id"
                type="number"
                value={form.id}
                disabled={editingId !== null}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-sort">Sort order</Label>
              <Input
                id="menu-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sort_order: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="menu-name">Name</Label>
              <Input
                id="menu-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-category">Category</Label>
              <Input
                id="menu-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-image">Image URL</Label>
              <Input
                id="menu-image"
                value={form.image_url ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-price">Price (AUD)</Label>
              <Input
                id="menu-price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-wholesale">Wholesale price (AUD)</Label>
              <Input
                id="menu-wholesale"
                type="number"
                step="0.01"
                value={form.wholesale_price ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, wholesale_price: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-available">Available</Label>
              <Select
                value={form.is_available ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, is_available: value === 'yes' }))
                }
              >
                <SelectTrigger id="menu-available">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-popular">Popular</Label>
              <Select
                value={form.is_popular ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, is_popular: value === 'yes' }))
                }
              >
                <SelectTrigger id="menu-popular">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="menu-description">Description</Label>
              <Textarea
                id="menu-description"
                rows={3}
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="menu-ingredients">
                Ingredients (JSON, optional)
              </Label>
              <Textarea
                id="menu-ingredients"
                rows={4}
                value={form.ingredients}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ingredients: e.target.value }))
                }
                placeholder='e.g. ["chicken", "lettuce", "chilli"] or an object'
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete menu item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{' '}
              <strong>{deleteTarget?.name}</strong> from the menu. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

