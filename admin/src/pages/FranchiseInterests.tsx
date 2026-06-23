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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import {
  CalendarDays,
  CircleCheckBig,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type InterestType = 'franchise' | 'consultation' | 'catering_enquiry' | 'wholesale_enquiry';
type InterestStatus = 'pending' | 'approved' | 'rejected' | 'resolved';

type FranchiseInterest = {
  id: number;
  interest_type: InterestType;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string;
  investment_budget: string | null;
  business_experience: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  business_name: string | null;
  business_type: string | null;
  estimated_weekly_volume: string | null;
  message: string | null;
  status: InterestStatus;
  created_at: string;
};

type FranchiseInterestInput = Omit<FranchiseInterest, 'id' | 'created_at'>;

const STATUS_OPTIONS: InterestStatus[] = ['pending', 'approved', 'rejected', 'resolved'];

function statusButtonClass(status: InterestStatus): string {
  switch (status) {
    case 'resolved':
      return 'text-green-700 focus:text-green-700 focus:bg-green-50';
    case 'approved':
      return 'text-blue-700 focus:text-blue-700 focus:bg-blue-50';
    case 'rejected':
      return 'text-red-700 focus:text-red-700 focus:bg-red-50';
    case 'pending':
    default:
      return 'text-amber-700 focus:text-amber-700 focus:bg-amber-50';
  }
}

function statusBadgeClass(status: InterestStatus): string {
  switch (status) {
    case 'resolved':
      return 'bg-green-100 text-green-700 hover:bg-green-100';
    case 'approved':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'rejected':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    case 'pending':
    default:
      return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  }
}

function emptyInput(type: InterestType): FranchiseInterestInput {
  return {
    interest_type: type,
    full_name: '',
    email: '',
    phone: null,
    city: null,
    state: type === 'wholesale_enquiry' ? '' : 'Tasmania',
    investment_budget: null,
    business_experience: null,
    preferred_date: null,
    preferred_time: null,
    business_name: null,
    business_type: null,
    estimated_weekly_volume: null,
    message: null,
    status: 'pending',
  };
}

function toInput(interest: FranchiseInterest): FranchiseInterestInput {
  return {
    interest_type: interest.interest_type,
    full_name: interest.full_name,
    email: interest.email,
    phone: interest.phone,
    city: interest.city,
    state: interest.state,
    investment_budget: interest.investment_budget,
    business_experience: interest.business_experience,
    preferred_date: interest.preferred_date,
    preferred_time: interest.preferred_time,
    business_name: interest.business_name,
    business_type: interest.business_type,
    estimated_weekly_volume: interest.estimated_weekly_volume,
    message: interest.message,
    status: interest.status,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateForm(form: FranchiseInterestInput, type: InterestType): string | null {
  if (form.full_name.trim().length < 1) {
    return 'Name is required.';
  }
  if (form.email.trim().length < 1) {
    return 'Email is required.';
  }
  if (type === 'wholesale_enquiry') {
    if (!form.business_name?.trim()) {
      return 'Business name is required.';
    }
    return null;
  }
  if (form.state.trim().length < 1) {
    return 'State is required.';
  }
  if (type === 'consultation' && !form.preferred_date) {
    return 'Preferred date is required for consultation.';
  }
  return null;
}

export function FranchiseInterests({ type }: { type: InterestType }) {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [rows, setRows] = useState<FranchiseInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FranchiseInterestInput>(() => emptyInput(type));
  const [deleteTarget, setDeleteTarget] = useState<FranchiseInterest | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | InterestStatus>('all');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        statusFilter === 'all' ? true : row.status === statusFilter,
      ),
    [rows, statusFilter],
  );

  const selectedCount = selectedIds.size;

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.has(row.id));

  const someFilteredSelected =
    filteredRows.some((row) => selectedIds.has(row.id)) && !allFilteredSelected;

  const pageTitle =
    type === 'consultation'
      ? 'Consultations'
      : type === 'wholesale_enquiry'
        ? 'Wholesale Enquiries'
        : type === 'catering_enquiry'
          ? 'Catering Enquiries'
          : 'Franchise Interests';

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('franchise_interests')
        .select('*')
        .eq('interest_type', type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as FranchiseInterest[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load franchise interests.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    setForm(emptyInput(type));
    setSelectedIds(new Set());
    if (!profileLoading && isAdmin) {
      void loadRows();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [isAdmin, profileLoading, loadRows, type]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected, filteredRows.length]);

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const row of filteredRows) {
          next.delete(row.id);
        }
        return next;
      });
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of filteredRows) {
        next.add(row.id);
      }
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyInput(type));
    setDialogOpen(true);
  };

  const openEdit = (row: FranchiseInterest) => {
    setEditingId(row.id);
    setForm(toInput(row));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const validation = validateForm(form, type);
    if (validation) {
      toast.error(validation);
      return;
    }

    const payload: FranchiseInterestInput = {
      interest_type: type,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: nullable(form.phone ?? ''),
      city: nullable(form.city ?? ''),
      state: form.state.trim() || 'Tasmania',
      investment_budget: nullable(form.investment_budget ?? ''),
      business_experience: nullable(form.business_experience ?? ''),
      preferred_date: form.preferred_date,
      preferred_time: nullable(form.preferred_time ?? ''),
      business_name: nullable(form.business_name ?? ''),
      business_type: nullable(form.business_type ?? ''),
      estimated_weekly_volume: nullable(form.estimated_weekly_volume ?? ''),
      message: nullable(form.message ?? ''),
      status: form.status,
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await supabase
          .from('franchise_interests')
          .update(payload)
          .eq('id', editingId)
          .eq('interest_type', type);
        if (error) throw error;
        toast.success('Entry updated.');
      } else {
        const { error } = await supabase.from('franchise_interests').insert(payload);
        if (error) throw error;
        toast.success('Entry created.');
      }
      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('franchise_interests')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('interest_type', type);
      if (error) throw error;
      toast.success('Entry deleted.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('franchise_interests')
        .delete()
        .in('id', ids)
        .eq('interest_type', type);
      if (error) throw error;
      toast.success(
        `Deleted ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'}.`,
      );
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete entries.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusUpdate = async (
    row: FranchiseInterest,
    status: InterestStatus,
  ) => {
    if (row.status === status) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('franchise_interests')
        .update({ status })
        .eq('id', row.id)
        .eq('interest_type', type);
      if (error) throw error;
      setRows((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, status } : item)),
      );
      toast.success(`Status updated to ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={pageTitle}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {pageTitle}
            </CardTitle>
            <CardDescription>
              Manage {type} submissions stored in <code>franchise_interests</code>.
            </CardDescription>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadRows()}
                disabled={loading}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={openCreate} disabled={loading}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {profileLoading || loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading…
            </div>
          ) : !isAdmin ? (
            <p className="text-muted-foreground">
              Administrator access is required to manage this data.
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No entries found.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="franchise-interest-status-filter" className="whitespace-nowrap">
                  Status
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as 'all' | InterestStatus)
                  }
                >
                  <SelectTrigger id="franchise-interest-status-filter" className="w-44">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
                {selectedCount > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={saving}
                  >
                    <Trash2 className="size-4" />
                    Delete {selectedCount}{' '}
                    {selectedCount === 1 ? 'item' : 'items'}
                  </Button>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="w-10 px-3 py-2">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={allFilteredSelected}
                        disabled={saving || filteredRows.length === 0}
                        aria-label="Select all visible entries"
                        onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Phone</th>
                    {type === 'franchise' ? (
                      <th className="px-3 py-2 text-left text-xs font-semibold">Budget</th>
                    ) : type === 'wholesale_enquiry' ? (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Business</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Weekly volume</th>
                      </>
                    ) : (
                      <th className="px-3 py-2 text-left text-xs font-semibold">Preferred</th>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Submitted</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        selectedIds.has(row.id) ? 'bg-muted/30' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={selectedIds.has(row.id)}
                          disabled={saving}
                          aria-label={`Select entry ${row.id}`}
                          onChange={(e) => toggleSelected(row.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-mono">{row.id}</td>
                      <td className="px-3 py-2 text-sm font-medium">{row.full_name}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{row.email}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{row.phone ?? '—'}</td>
                      {type === 'franchise' ? (
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {row.investment_budget ?? '—'}
                        </td>
                      ) : type === 'wholesale_enquiry' ? (
                        <>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.business_name ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.business_type ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-sm text-muted-foreground">
                            {row.estimated_weekly_volume ?? '—'}
                          </td>
                        </>
                      ) : (
                        <td className="px-3 py-2 text-sm text-muted-foreground">
                          {row.preferred_date ?? '—'}
                          {row.preferred_time ? ` · ${row.preferred_time}` : ''}
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm">
                        <Badge variant="secondary" className={statusBadgeClass(row.status)}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                disabled={saving}
                              >
                                <CircleCheckBig className="size-3.5" />
                                Resolve
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {STATUS_OPTIONS.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  className={statusButtonClass(status)}
                                  onClick={() => void handleQuickStatusUpdate(row, status)}
                                  disabled={row.status === status || saving}
                                >
                                  {status}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? 'Edit entry' : 'Add entry'}</DialogTitle>
            <DialogDescription>
              Manage fields for {type} submissions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="interest-name">
                {type === 'wholesale_enquiry' ? 'Contact name' : 'Name'}
              </Label>
              <Input
                id="interest-name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interest-email">Email</Label>
              <Input
                id="interest-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interest-phone">Phone</Label>
              <Input
                id="interest-phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || null }))}
                disabled={saving}
              />
            </div>
            {type !== 'wholesale_enquiry' ? (
              <div className="grid gap-2">
                <Label htmlFor="interest-state">State</Label>
                <Input
                  id="interest-state"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  disabled={saving}
                />
              </div>
            ) : null}
            {type === 'wholesale_enquiry' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="interest-business-name">Business name</Label>
                  <Input
                    id="interest-business-name"
                    value={form.business_name ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        business_name: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interest-business-type">Business type</Label>
                  <Input
                    id="interest-business-type"
                    value={form.business_type ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        business_type: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="interest-weekly-volume">Estimated weekly volume</Label>
                  <Input
                    id="interest-weekly-volume"
                    value={form.estimated_weekly_volume ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        estimated_weekly_volume: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              </>
            ) : type === 'franchise' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="interest-city">City</Label>
                  <Input
                    id="interest-city"
                    value={form.city ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value || null }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interest-budget">Investment budget</Label>
                  <Input
                    id="interest-budget"
                    value={form.investment_budget ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        investment_budget: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="interest-experience">Business experience</Label>
                  <Textarea
                    id="interest-experience"
                    rows={3}
                    value={form.business_experience ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        business_experience: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="interest-preferred-date">Preferred date</Label>
                  <Input
                    id="interest-preferred-date"
                    type="date"
                    value={form.preferred_date ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        preferred_date: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interest-preferred-time">Preferred time</Label>
                  <Input
                    id="interest-preferred-time"
                    value={form.preferred_time ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        preferred_time: e.target.value || null,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              </>
            )}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="interest-message">Message</Label>
              <Textarea
                id="interest-message"
                rows={4}
                value={form.message ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value || null }))}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interest-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, status: value as InterestStatus }))
                }
                disabled={saving}
              >
                <SelectTrigger id="interest-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
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
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedCount}{' '}
              {selectedCount === 1 ? 'submission' : 'submissions'} from{' '}
              <code>franchise_interests</code>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleBulkDelete();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting…' : `Delete ${selectedCount} items`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the submission from{' '}
              <strong>{deleteTarget?.full_name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
