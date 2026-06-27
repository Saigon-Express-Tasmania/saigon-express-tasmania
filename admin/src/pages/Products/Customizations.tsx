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
import { RefreshTableButton } from '@/components/ui/refresh-table-button';
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
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const CUSTOMIZATION_KINDS = ['menu', 'wholesale', 'catering'] as const;
type CustomizationKind = (typeof CUSTOMIZATION_KINDS)[number];

const SELECTION_TYPES = ['single', 'multi'] as const;
type SelectionType = (typeof SELECTION_TYPES)[number];

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

type OptionRecord = {
  id: number;
  key: string;
  title: string;
  price: number;
  sort_order: number;
};

type CustomizationRecord = {
  id: number;
  kind: CustomizationKind;
  key: string;
  title: string;
  type: SelectionType;
  required: boolean;
  sort_order: number;
  options: OptionRecord[];
};

type OptionInput = {
  id?: number;
  key: string;
  title: string;
  price: string;
};

type CustomizationInput = {
  kind: CustomizationKind;
  key: string;
  title: string;
  type: SelectionType;
  required: boolean;
  sort_order: number;
  options: OptionInput[];
};

const emptyCustomizationInput = (): CustomizationInput => ({
  kind: 'menu',
  key: '',
  title: '',
  type: 'single',
  required: false,
  sort_order: 0,
  options: [],
});

function kindLabel(kind: CustomizationKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formatAud(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function sortOptions<T extends { sort_order: number; id?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

function normalizeCustomizationRow(row: {
  id: number;
  kind: CustomizationKind;
  key: string;
  title: string;
  type: SelectionType;
  required: boolean;
  sort_order: number;
  options?: OptionRecord[] | null;
}): CustomizationRecord {
  return {
    ...row,
    options: sortOptions(row.options ?? []),
  };
}

function emptyOptionInput(): OptionInput {
  return { key: '', title: '', price: '0' };
}

function validateKey(key: string, label: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return `${label} key is required.`;
  if (!KEY_PATTERN.test(trimmed)) {
    return `${label} key must use lowercase letters, numbers, and underscores only (start with a letter).`;
  }
  return null;
}

export function Customizations() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [customizations, setCustomizations] = useState<CustomizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomizationInput>(emptyCustomizationInput());

  const [deleteTarget, setDeleteTarget] = useState<CustomizationRecord | null>(
    null,
  );

  const loadCustomizations = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('product_customizations')
        .select(
          `
          id,
          kind,
          key,
          title,
          type,
          required,
          sort_order,
          options:product_customization_options (
            id,
            key,
            title,
            price,
            sort_order
          )
        `,
        )
        .order('kind', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setCustomizations(
        (data ?? []).map((row) =>
          normalizeCustomizationRow(row as CustomizationRecord),
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load product customizations.';
      setError(message);
      setCustomizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadCustomizations();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadCustomizations]);

  const filteredCustomizations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customizations.filter((row) => {
      if (kindFilter !== 'all' && row.kind !== kindFilter) {
        return false;
      }
      if (!term) return true;
      return (
        row.kind.toLowerCase().includes(term) ||
        row.key.toLowerCase().includes(term) ||
        row.title.toLowerCase().includes(term) ||
        row.type.toLowerCase().includes(term) ||
        row.options.some(
          (opt) =>
            opt.key.toLowerCase().includes(term) ||
            opt.title.toLowerCase().includes(term),
        )
      );
    });
  }, [customizations, search, kindFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyCustomizationInput(),
      kind:
        kindFilter !== 'all' ? (kindFilter as CustomizationKind) : 'menu',
      sort_order: customizations.length,
    });
    setDialogOpen(true);
  };

  const openEdit = (row: CustomizationRecord) => {
    setEditingId(row.id);
    setForm({
      kind: row.kind,
      key: row.key,
      title: row.title,
      type: row.type,
      required: row.required,
      sort_order: row.sort_order,
      options: row.options.map((opt) => ({
        id: opt.id,
        key: opt.key,
        title: opt.title,
        price: String(opt.price),
      })),
    });
    setDialogOpen(true);
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, emptyOptionInput()],
    }));
  };

  const updateOption = (
    index: number,
    patch: Partial<OptionInput>,
  ) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, ...patch } : opt,
      ),
    }));
  };

  const removeOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.options.length) {
        return prev;
      }
      const options = [...prev.options];
      const [item] = options.splice(index, 1);
      options.splice(nextIndex, 0, item);
      return { ...prev, options };
    });
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return false;
    }

    const groupKeyError = validateKey(form.key, 'Group');
    if (groupKeyError) {
      toast.error(groupKeyError);
      return false;
    }

    const optionKeys = new Set<string>();
    for (let i = 0; i < form.options.length; i += 1) {
      const opt = form.options[i];
      if (!opt.title.trim()) {
        toast.error(`Option ${i + 1}: title is required.`);
        return false;
      }
      const optionKeyError = validateKey(opt.key, `Option ${i + 1}`);
      if (optionKeyError) {
        toast.error(optionKeyError);
        return false;
      }
      if (optionKeys.has(opt.key.trim())) {
        toast.error(`Duplicate option key "${opt.key.trim()}".`);
        return false;
      }
      optionKeys.add(opt.key.trim());

      const price = Number(opt.price);
      if (!Number.isFinite(price) || price < 0) {
        toast.error(`Option ${i + 1}: price must be a non-negative number.`);
        return false;
      }
    }

    return true;
  };

  const syncOptions = async (
    customizationId: number,
    options: OptionInput[],
  ) => {
    const { data: existing, error: fetchError } = await supabase
      .from('product_customization_options')
      .select('id')
      .eq('customization_id', customizationId);

    if (fetchError) throw fetchError;

    const keepIds = new Set(
      options.map((opt) => opt.id).filter((id): id is number => id != null),
    );
    const deleteIds = (existing ?? [])
      .map((row) => row.id)
      .filter((id) => !keepIds.has(id));

    if (deleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('product_customization_options')
        .delete()
        .in('id', deleteIds);
      if (deleteError) throw deleteError;
    }

    for (let index = 0; index < options.length; index += 1) {
      const opt = options[index];
      const payload = {
        customization_id: customizationId,
        key: opt.key.trim(),
        title: opt.title.trim(),
        price: Number(opt.price),
        sort_order: (index + 1) * 10,
      };

      if (opt.id != null) {
        const { error: updateError } = await supabase
          .from('product_customization_options')
          .update(payload)
          .eq('id', opt.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('product_customization_options')
          .insert(payload);
        if (insertError) throw insertError;
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const groupPayload = {
        kind: form.kind,
        key: form.key.trim(),
        title: form.title.trim(),
        type: form.type,
        required: form.required,
        sort_order: Number(form.sort_order) || 0,
      };

      if (editingId != null) {
        const { error: updateError } = await supabase
          .from('product_customizations')
          .update(groupPayload)
          .eq('id', editingId);
        if (updateError) throw updateError;

        await syncOptions(editingId, form.options);
        toast.success('Customization updated.');
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('product_customizations')
          .insert(groupPayload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (!inserted?.id) {
          throw new Error('Customization was created but no id was returned.');
        }

        await syncOptions(inserted.id, form.options);
        toast.success('Customization created.');
      }

      setDialogOpen(false);
      await loadCustomizations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save customization.',
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
        .from('product_customizations')
        .delete()
        .eq('id', deleteTarget.id);
      if (deleteError) throw deleteError;

      toast.success('Customization deleted.');
      if (expandedId === deleteTarget.id) {
        setExpandedId(null);
      }
      setDeleteTarget(null);
      await loadCustomizations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete customization.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Customizations">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Customizations">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage product customizations.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customizations">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Product customizations</CardTitle>
              <CardDescription>
                Manage option groups and their choices for menu, catering, and
                wholesale products. Categories and products reference these
                groups by id.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadCustomizations()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add group
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Search title, key, kind, or option labels…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="customization-kind-filter" className="whitespace-nowrap">
                  Channel
                </Label>
                <Select value={kindFilter} onValueChange={setKindFilter}>
                  <SelectTrigger id="customization-kind-filter" className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CUSTOMIZATION_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {kindLabel(kind)}
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
            ) : filteredCustomizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No customization groups found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-2 py-3" aria-label="Expand" />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Group
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Channel
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Options
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomizations.map((row) => {
                      const isExpanded = expandedId === row.id;
                      return (
                        <GroupTableRows
                          key={row.id}
                          row={row}
                          isExpanded={isExpanded}
                          onToggle={() =>
                            setExpandedId((current) =>
                              current === row.id ? null : row.id,
                            )
                          }
                          onEdit={() => openEdit(row)}
                          onDelete={() => setDeleteTarget(row)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(90vh,900px)] max-w-3xl flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? 'Edit customization group' : 'Add customization group'}
            </DialogTitle>
            <DialogDescription>
              Define the group settings and its selectable options together.
              Keys must be stable lowercase identifiers used in cart data.
            </DialogDescription>
          </DialogHeader>

          <div className="grid flex-1 gap-6 overflow-y-auto py-1 pr-1">
            <section className="rounded-lg border bg-muted/10 p-4">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Group details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="customization-title">Title</Label>
                  <Input
                    id="customization-title"
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Spice Level"
                    className="w-full"
                  />
                </div>

                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="customization-key">Group key</Label>
                  <Input
                    id="customization-key"
                    value={form.key}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      }))
                    }
                    placeholder="spice"
                    className="w-full font-mono text-sm"
                  />
                </div>

                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="customization-kind">Channel</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        kind: value as CustomizationKind,
                      }))
                    }
                  >
                    <SelectTrigger id="customization-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {CUSTOMIZATION_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kindLabel(kind)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="customization-type">Selection type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        type: value as SelectionType,
                      }))
                    }
                  >
                    <SelectTrigger id="customization-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="single">Single choice</SelectItem>
                      <SelectItem value="multi">Multiple choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="customization-sort">Sort order</Label>
                  <Input
                    id="customization-sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sort_order: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <label
                  htmlFor="customization-required"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-4 py-3 sm:col-span-2"
                >
                  <input
                    id="customization-required"
                    type="checkbox"
                    checked={form.required}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        required: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">
                      Required before add to cart
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Customers must pick at least one option in this group.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Options</h3>
                  <p className="text-xs text-muted-foreground">
                    {form.options.length} option
                    {form.options.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add option
                </Button>
              </div>

              {form.options.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  No options yet. Add choices customers can pick from.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <div className="hidden gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.4fr)_7rem_5.5rem]">
                    <span>#</span>
                    <span>Key</span>
                    <span>Title</span>
                    <span>Price (AUD)</span>
                    <span className="text-right">Order</span>
                  </div>
                  <div className="divide-y">
                    {form.options.map((opt, index) => (
                      <div
                        key={opt.id ?? `new-${index}`}
                        className="grid gap-3 bg-background p-3 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.4fr)_7rem_5.5rem] sm:items-end"
                      >
                        <div className="flex items-center gap-1 text-muted-foreground sm:pb-2">
                          <GripVertical className="hidden h-4 w-4 sm:block" />
                          <span className="w-5 text-center text-xs font-medium">
                            {index + 1}
                          </span>
                        </div>

                        <div className="grid min-w-0 gap-1.5">
                          <Label className="text-xs text-muted-foreground sm:sr-only">
                            Key
                          </Label>
                          <Input
                            value={opt.key}
                            onChange={(e) =>
                              updateOption(index, {
                                key: e.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, '_'),
                              })
                            }
                            placeholder="medium"
                            className="h-9 w-full font-mono text-sm"
                          />
                        </div>

                        <div className="grid min-w-0 gap-1.5">
                          <Label className="text-xs text-muted-foreground sm:sr-only">
                            Title
                          </Label>
                          <Input
                            value={opt.title}
                            onChange={(e) =>
                              updateOption(index, { title: e.target.value })
                            }
                            placeholder="Medium"
                            className="h-9 w-full"
                          />
                        </div>

                        <div className="grid min-w-0 gap-1.5">
                          <Label className="text-xs text-muted-foreground sm:sr-only">
                            Price (AUD)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={opt.price}
                            onChange={(e) =>
                              updateOption(index, { price: e.target.value })
                            }
                            className="h-9 w-full"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-1 sm:pb-0.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            disabled={index === 0}
                            onClick={() => moveOption(index, -1)}
                            aria-label="Move option up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            disabled={index === form.options.length - 1}
                            onClick={() => moveOption(index, 1)}
                            aria-label="Move option down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeOption(index)}
                            aria-label="Remove option"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
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
                'Save group'
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
            <AlertDialogTitle>Delete customization group?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.title}</strong> and
              all {deleteTarget?.options.length ?? 0} option
              {(deleteTarget?.options.length ?? 0) === 1 ? '' : 's'}. Categories
              or products referencing this group will keep stale ids until
              updated.
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

function GroupTableRows({
  row,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  row: CustomizationRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-b hover:bg-muted/30">
        <td className="px-2 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse options' : 'Expand options'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <div className="font-medium">{row.title}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {row.key}
              <span className="mx-1.5 text-border">·</span>
              id {row.id}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant="outline">{kindLabel(row.kind)}</Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">
              {row.type === 'single' ? 'Single' : 'Multi'}
            </Badge>
            {row.required ? (
              <Badge>Required</Badge>
            ) : (
              <Badge variant="ghost">Optional</Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {row.options.length}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label={`Edit ${row.title}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${row.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b bg-muted/15">
          <td colSpan={6} className="px-4 py-4">
            {row.options.length === 0 ? (
              <p className="text-sm text-muted-foreground">No options defined.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-background">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Key</th>
                      <th className="px-3 py-2 text-left font-medium">Title</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.options.map((opt, index) => (
                      <tr
                        key={opt.id}
                        className={cn(
                          'border-b last:border-b-0',
                          index % 2 === 1 && 'bg-muted/20',
                        )}
                      >
                        <td className="px-3 py-2 text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{opt.key}</td>
                        <td className="px-3 py-2">{opt.title}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatAud(opt.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
