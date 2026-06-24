import { BlogPostAssetReferencesPanel } from '@/components/BlogPostAssetReferencesPanel';
import { HtmlRichTextEditor } from '@/components/HtmlRichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import {
  appendUploadedAsset,
  emptyBlogPostReference,
  normalizeBlogPostReference,
  type BlogPostReference,
} from '@/types/BlogPost';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  FileText,
  LayoutDashboard,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const RESOURCE_TYPE = 'document' as const;
const CONTENT_AUTO_SAVE_MS = 3000;

type EditorTab = 'main' | 'content' | 'files';

const formGridClass = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';
const tabPanelScrollClass =
  'mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden';

const SECTION_ACCENTS = {
  identity:
    'border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-900/50 dark:from-sky-950/30',
  classification:
    'border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-background dark:border-emerald-900/50 dark:from-emerald-950/30',
  publishing:
    'border-amber-200/70 bg-gradient-to-br from-amber-50/70 to-background dark:border-amber-900/50 dark:from-amber-950/25',
  metadata:
    'border-violet-200/70 bg-gradient-to-br from-violet-50/60 to-background dark:border-violet-900/50 dark:from-violet-950/25',
  content:
    'border-sky-200/70 bg-gradient-to-br from-sky-50/70 to-background dark:border-sky-900/50 dark:from-sky-950/25',
  assets:
    'border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50/50 to-background dark:border-fuchsia-900/40 dark:from-fuchsia-950/20',
  files:
    'border-indigo-200/70 bg-gradient-to-br from-indigo-50/70 to-background dark:border-indigo-900/50 dark:from-indigo-950/25',
  attachments:
    'border-teal-200/70 bg-gradient-to-br from-teal-50/60 to-background dark:border-teal-900/50 dark:from-teal-950/25',
} as const;

type ToggleTone = 'published' | 'featured' | 'mandatory' | 'ack';

const TOGGLE_TONE_CLASS: Record<
  ToggleTone,
  { active: string; idle: string }
> = {
  published: {
    active:
      'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/25 dark:text-emerald-100',
    idle: 'border-border/60 bg-background hover:border-emerald-300/50 hover:bg-emerald-50/30',
  },
  featured: {
    active:
      'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25 dark:text-amber-100',
    idle: 'border-border/60 bg-background hover:border-amber-300/50 hover:bg-amber-50/30',
  },
  mandatory: {
    active:
      'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/25 dark:text-rose-100',
    idle: 'border-border/60 bg-background hover:border-rose-300/50 hover:bg-rose-50/30',
  },
  ack: {
    active:
      'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/25 dark:text-indigo-100',
    idle: 'border-border/60 bg-background hover:border-indigo-300/50 hover:bg-indigo-50/30',
  },
};

const TOGGLE_CHECKBOX_CLASS: Record<ToggleTone, string> = {
  published: 'border-emerald-600 bg-emerald-600 text-white',
  featured: 'border-amber-600 bg-amber-600 text-white',
  mandatory: 'border-rose-600 bg-rose-600 text-white',
  ack: 'border-indigo-600 bg-indigo-600 text-white',
};

const RESOURCE_COLUMNS =
  'id, type, title, slug, category_id, course_id, period_id, author_name, icon, description, summary, content, content_format, attached_files, content_file, version, is_published, is_featured, is_mandatory, requires_acknowledgement, sort_order, tags, external_url, thumbnail_url, estimated_read_minutes, effective_from, effective_until, published_at, reference, created_at, updated_at';

type SortColumn = 'id' | 'title' | 'slug';
type SortDirection = 'asc' | 'desc';

type TaxonomyOption = {
  id: number;
  kind: 'category' | 'course' | 'period';
  label: string;
  alias: string;
};

type AttachedFile = {
  name: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
};

type FranchiseResourceRow = {
  id: number;
  type: typeof RESOURCE_TYPE;
  title: string;
  slug: string;
  category_id: number | null;
  course_id: number | null;
  period_id: number | null;
  author_name: string | null;
  icon: string | null;
  description: string | null;
  summary: string | null;
  content: string | null;
  content_format: string;
  attached_files: AttachedFile[];
  content_file: string | null;
  version: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_mandatory: boolean;
  requires_acknowledgement: boolean;
  sort_order: number;
  tags: string[];
  external_url: string | null;
  thumbnail_url: string | null;
  estimated_read_minutes: number | null;
  effective_from: string | null;
  effective_until: string | null;
  published_at: string | null;
  reference: BlogPostReference;
  created_at: string;
  updated_at: string;
};

type ResourceInput = {
  title: string;
  slug: string;
  category_id: string;
  course_id: string;
  period_id: string;
  author_name: string;
  icon: string;
  description: string;
  summary: string;
  content: string;
  content_format: 'html' | 'markdown' | 'plain';
  attached_files: AttachedFile[];
  content_file: string;
  version: string;
  is_published: boolean;
  is_featured: boolean;
  is_mandatory: boolean;
  requires_acknowledgement: boolean;
  sort_order: string;
  tags: string;
  external_url: string;
  thumbnail_url: string;
  estimated_read_minutes: string;
  effective_from: string;
  effective_until: string;
  published_at: string;
  reference: BlogPostReference;
};

const CONTENT_FORMAT_OPTIONS: {
  value: ResourceInput['content_format'];
  label: string;
  description: string;
  badgeClass: string;
  activeClass: string;
}[] = [
  {
    value: 'html',
    label: 'HTML',
    description: 'Rich text editor with images',
    badgeClass:
      'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-200',
    activeClass: 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30',
  },
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Plain markdown source',
    badgeClass:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200',
    activeClass: 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30',
  },
  {
    value: 'plain',
    label: 'Plain text',
    description: 'Unformatted text only',
    badgeClass:
      'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
    activeClass: 'border-slate-500 bg-slate-500/10 ring-2 ring-slate-500/30',
  },
];

function emptyResourceInput(): ResourceInput {
  return {
    title: '',
    slug: '',
    category_id: '',
    course_id: '',
    period_id: '',
    author_name: '',
    icon: '',
    description: '',
    summary: '',
    content: '',
    content_format: 'html',
    attached_files: [],
    content_file: '',
    version: '',
    is_published: false,
    is_featured: false,
    is_mandatory: false,
    requires_acknowledgement: false,
    sort_order: '0',
    tags: '',
    external_url: '',
    thumbnail_url: '',
    estimated_read_minutes: '',
    effective_from: '',
    effective_until: '',
    published_at: '',
    reference: emptyBlogPostReference(),
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  if (!base) return fileName.trim();
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
}

function formatTags(tags: string[]): string {
  return tags.join(', ');
}

function normalizeAttachedFiles(value: unknown): AttachedFile[] {
  if (!Array.isArray(value)) return [];
  const files: AttachedFile[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name : '';
    const url = typeof row.url === 'string' ? row.url : '';
    if (!name || !url) continue;
    files.push({
      name,
      url,
      mime_type: typeof row.mime_type === 'string' ? row.mime_type : undefined,
      size_bytes:
        typeof row.size_bytes === 'number' ? row.size_bytes : undefined,
    });
  }
  return files;
}

function normalizeResourceRow(row: Record<string, unknown>): FranchiseResourceRow {
  const referenceRaw = row.reference ?? row.metadata;
  let reference = emptyBlogPostReference();
  if (referenceRaw && typeof referenceRaw === 'object' && !Array.isArray(referenceRaw)) {
    reference = normalizeBlogPostReference(referenceRaw);
  }

  return {
    id: row.id as number,
    type: RESOURCE_TYPE,
    title: row.title as string,
    slug: row.slug as string,
    category_id: (row.category_id as number | null) ?? null,
    course_id: (row.course_id as number | null) ?? null,
    period_id: (row.period_id as number | null) ?? null,
    author_name: (row.author_name as string | null) ?? null,
    icon: (row.icon as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    content: (row.content as string | null) ?? null,
    content_format: (row.content_format as string) ?? 'html',
    attached_files: normalizeAttachedFiles(row.attached_files),
    content_file: (row.content_file as string | null) ?? null,
    version: (row.version as string | null) ?? null,
    is_published: Boolean(row.is_published),
    is_featured: Boolean(row.is_featured),
    is_mandatory: Boolean(row.is_mandatory),
    requires_acknowledgement: Boolean(row.requires_acknowledgement),
    sort_order: Number(row.sort_order) || 0,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    external_url: (row.external_url as string | null) ?? null,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    estimated_read_minutes:
      row.estimated_read_minutes == null
        ? null
        : Number(row.estimated_read_minutes),
    effective_from: (row.effective_from as string | null) ?? null,
    effective_until: (row.effective_until as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    reference,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToInput(row: FranchiseResourceRow): ResourceInput {
  return {
    title: row.title,
    slug: row.slug,
    category_id: row.category_id != null ? String(row.category_id) : '',
    course_id: row.course_id != null ? String(row.course_id) : '',
    period_id: row.period_id != null ? String(row.period_id) : '',
    author_name: row.author_name ?? '',
    icon: row.icon ?? '',
    description: row.description ?? '',
    summary: row.summary ?? '',
    content: row.content ?? '',
    content_format:
      row.content_format === 'markdown' || row.content_format === 'plain'
        ? row.content_format
        : 'html',
    attached_files: row.attached_files,
    content_file: row.content_file ?? '',
    version: row.version ?? '',
    is_published: row.is_published,
    is_featured: row.is_featured,
    is_mandatory: row.is_mandatory,
    requires_acknowledgement: row.requires_acknowledgement,
    sort_order: String(row.sort_order),
    tags: formatTags(row.tags),
    external_url: row.external_url ?? '',
    thumbnail_url: row.thumbnail_url ?? '',
    estimated_read_minutes:
      row.estimated_read_minutes != null
        ? String(row.estimated_read_minutes)
        : '',
    effective_from: toDatetimeLocalValue(row.effective_from),
    effective_until: toDatetimeLocalValue(row.effective_until),
    published_at: toDatetimeLocalValue(row.published_at),
    reference: row.reference,
  };
}

function parseOptionalId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const id = Number.parseInt(trimmed, 10);
  return Number.isNaN(id) ? null : id;
}

function canPersistResource(form: ResourceInput): boolean {
  const slug = form.slug.trim();
  return (
    Boolean(form.title.trim()) &&
    Boolean(slug) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

function buildResourcePayload(form: ResourceInput) {
  const sortOrder = Number.parseInt(form.sort_order, 10);
  const readMinutes = form.estimated_read_minutes.trim()
    ? Number.parseInt(form.estimated_read_minutes, 10)
    : null;

  return {
    type: RESOURCE_TYPE,
    title: form.title.trim(),
    slug: form.slug.trim(),
    category_id: parseOptionalId(form.category_id),
    course_id: parseOptionalId(form.course_id),
    period_id: parseOptionalId(form.period_id),
    author_name: form.author_name.trim() || null,
    icon: form.icon.trim() || null,
    description: form.description.trim() || null,
    summary: form.summary.trim() || null,
    content: form.content.trim() || null,
    content_format: form.content_format,
    attached_files: form.attached_files,
    content_file: form.content_file.trim() || null,
    version: form.version.trim() || null,
    is_published: form.is_published,
    is_featured: form.is_featured,
    is_mandatory: form.is_mandatory,
    requires_acknowledgement: form.requires_acknowledgement,
    sort_order: Number.isNaN(sortOrder) || sortOrder < 0 ? 0 : sortOrder,
    tags: parseTags(form.tags),
    external_url: form.external_url.trim() || null,
    thumbnail_url: form.thumbnail_url.trim() || null,
    estimated_read_minutes:
      readMinutes == null || Number.isNaN(readMinutes) || readMinutes < 0
        ? null
        : readMinutes,
    effective_from: fromDatetimeLocalValue(form.effective_from),
    effective_until: fromDatetimeLocalValue(form.effective_until),
    published_at: fromDatetimeLocalValue(form.published_at),
    reference: form.reference,
  };
}

function resolveImagePreview(
  imageUrl: string | null | undefined,
  getPublicUrl: (path: string) => string,
): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return getPublicUrl(value);
}

function ResourceFormSection({
  title,
  description,
  children,
  className,
  accentClass,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  accentClass?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-4 shadow-xs',
        accentClass ?? 'border-border/70 bg-muted/20',
        className,
      )}
    >
      <div className="mb-4 border-b border-border/40 pb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ResourceFormField({
  label,
  htmlFor,
  description,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {description ? (
        <p className="-mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </div>
  );
}

function ResourceToggleField({
  label,
  description,
  checked,
  onChange,
  tone = 'published',
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: ToggleTone;
}) {
  const styles = TOGGLE_TONE_CLASS[tone];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-all',
        checked ? cn('font-medium', styles.active) : styles.idle,
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          checked
            ? TOGGLE_CHECKBOX_CLASS[tone]
            : 'border-muted-foreground/40 bg-background',
        )}
      >
        {checked ? <Check className="h-3 w-3 stroke-[3]" aria-hidden /> : null}
      </span>
      <div className="grid gap-0.5">
        <span className="text-sm font-medium leading-none">{label}</span>
        {description ? (
          <span className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = sortColumn === column;
  const Icon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className="px-4 py-3 text-left text-sm font-semibold">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground/80"
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </th>
  );
}

export default function ResourcesHub() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia, isUploading, getPublicUrl } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [resources, setResources] = useState<FranchiseResourceRow[]>([]);
  const [taxonomies, setTaxonomies] = useState<TaxonomyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ResourceInput>(emptyResourceInput());
  const [slugTouched, setSlugTouched] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const [editorTab, setEditorTab] = useState<EditorTab>('main');
  const [deleteTarget, setDeleteTarget] = useState<FranchiseResourceRow | null>(
    null,
  );

  const formRef = useRef(form);
  formRef.current = form;
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;
  const contentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);

  const taxonomyByKind = useMemo(() => {
    return {
      category: taxonomies.filter((row) => row.kind === 'category'),
      course: taxonomies.filter((row) => row.kind === 'course'),
      period: taxonomies.filter((row) => row.kind === 'period'),
    };
  }, [taxonomies]);

  const taxonomyLabelById = useMemo(() => {
    return new Map(taxonomies.map((row) => [row.id, row.label]));
  }, [taxonomies]);

  const clearContentAutoSaveTimer = useCallback(() => {
    if (contentSaveTimerRef.current) {
      clearTimeout(contentSaveTimerRef.current);
      contentSaveTimerRef.current = null;
    }
  }, []);

  const loadTaxonomies = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('franchise_resource_taxonomies')
      .select('id, kind, label, alias')
      .eq('place', 'document')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (fetchError) throw fetchError;
    setTaxonomies((data ?? []) as TaxonomyOption[]);
  }, []);

  const loadResources = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('franchise_resources')
        .select(RESOURCE_COLUMNS)
        .eq('type', RESOURCE_TYPE)
        .order('sort_order', { ascending: true })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setResources(
        (data ?? []).map((row) =>
          normalizeResourceRow(row as Record<string, unknown>),
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load documents.';
      setError(message);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void Promise.all([loadResources(), loadTaxonomies()]).catch((err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load resources hub data.',
      );
    });
  }, [isAdmin, loadResources, loadTaxonomies]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'id' ? 'desc' : 'asc');
  };

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = resources.filter((row) => {
      if (!term) return true;
      return (
        row.title.toLowerCase().includes(term) ||
        row.slug.toLowerCase().includes(term) ||
        (row.summary ?? '').toLowerCase().includes(term) ||
        (row.author_name ?? '').toLowerCase().includes(term) ||
        String(row.id).includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') return (a.id - b.id) * direction;
      return a[sortColumn].localeCompare(b[sortColumn]) * direction;
    });
  }, [resources, search, sortColumn, sortDirection]);

  const openCreate = () => {
    clearContentAutoSaveTimer();
    lastSavedContentRef.current = null;
    editingIdRef.current = null;
    setEditingId(null);
    setSlugTouched(false);
    setForm(emptyResourceInput());
    setThumbnailPreviewUrl(null);
    setEditorTab('main');
    setDialogOpen(true);
  };

  const openEdit = (row: FranchiseResourceRow) => {
    clearContentAutoSaveTimer();
    lastSavedContentRef.current = row.content ?? '';
    editingIdRef.current = row.id;
    setEditingId(row.id);
    setSlugTouched(true);
    setForm(rowToInput(row));
    setThumbnailPreviewUrl(resolveImagePreview(row.thumbnail_url, getPublicUrl));
    setEditorTab('main');
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
  };

  const handleThumbnailUpload = async (fileInputs: File | File[]) => {
    const file = Array.isArray(fileInputs) ? fileInputs[0] : fileInputs;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const slugPart = slugify(form.slug) || 'document';
    const fileName = `${slugPart}-thumbnail-${Date.now()}.${ext}`;

    try {
      const { publicUrl } = await uploadMedia(file, {
        folder: 'franchise-documents',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({ ...prev, thumbnail_url: publicUrl }));
      setThumbnailPreviewUrl(publicUrl);
      toast.success('Thumbnail uploaded.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload thumbnail.',
      );
      throw err;
    }
  };

  const handleThumbnailClear = () => {
    setForm((prev) => ({ ...prev, thumbnail_url: '' }));
    setThumbnailPreviewUrl(null);
  };

  const handleContentFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const derivedTitle = titleFromFileName(file.name);
    const slugPart =
      slugify(form.slug) || slugify(derivedTitle) || 'document';
    const fileName = `${slugPart}-content-${Date.now()}.${ext}`;

    try {
      const { publicUrl } = await uploadMedia(file, {
        folder: 'franchise-documents',
        fileName,
        upsert: true,
      });
      setForm((prev) => {
        if (prev.title.trim()) {
          return { ...prev, content_file: publicUrl };
        }
        return {
          ...prev,
          content_file: publicUrl,
          title: derivedTitle,
          slug: slugTouched ? prev.slug : slugify(derivedTitle),
        };
      });
      toast.success('Document file uploaded.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload document file.',
      );
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const slugPart = slugify(form.slug) || 'document';
    const fileName = `${slugPart}-attachment-${Date.now()}.${ext}`;

    try {
      const { publicUrl } = await uploadMedia(file, {
        folder: 'franchise-documents',
        fileName,
        upsert: true,
      });
      setForm((prev) => ({
        ...prev,
        attached_files: [
          ...prev.attached_files,
          {
            name: file.name,
            url: publicUrl,
            mime_type: file.type || undefined,
            size_bytes: file.size,
          },
        ],
      }));
      toast.success('Attachment added.');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to upload attachment.',
      );
    }
  };

  const removeAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attached_files: prev.attached_files.filter((_, i) => i !== index),
    }));
  };

  const autoSaveReference = useCallback(
    async (reference: BlogPostReference, content?: string) => {
      const currentForm = formRef.current;
      const nextForm: ResourceInput = {
        ...currentForm,
        reference,
        ...(content !== undefined ? { content } : {}),
      };

      formRef.current = nextForm;
      setForm(nextForm);

      const resourceId = editingIdRef.current;

      try {
        setSaving(true);

        if (resourceId !== null) {
          const patch: { reference: BlogPostReference; content?: string | null } = {
            reference,
          };
          if (content !== undefined) {
            patch.content = content.trim() || null;
            lastSavedContentRef.current = patch.content ?? '';
            clearContentAutoSaveTimer();
          }

          const { error: updateError } = await supabase
            .from('franchise_resources')
            .update(patch)
            .eq('id', resourceId);

          if (updateError) throw updateError;
        } else if (canPersistResource(nextForm)) {
          const { data, error: insertError } = await supabase
            .from('franchise_resources')
            .insert(buildResourcePayload(nextForm))
            .select('id')
            .single();

          if (insertError) throw insertError;

          editingIdRef.current = data.id;
          setEditingId(data.id);
          setSlugTouched(true);
        } else {
          return;
        }

        await loadResources();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Failed to save asset references.',
        );
      } finally {
        setSaving(false);
      }
    },
    [clearContentAutoSaveTimer, loadResources],
  );

  const handleAssetUploaded = useCallback(
    async (
      asset: { path: string; publicUrl: string; fileName: string },
      contentHtml: string,
    ) => {
      const current = formRef.current;
      const reference = appendUploadedAsset(current.reference, {
        ...asset,
        uploadedAt: new Date().toISOString(),
      });
      await autoSaveReference(reference, contentHtml);
    },
    [autoSaveReference],
  );

  const handleReferenceChange = useCallback(
    async (reference: BlogPostReference) => {
      await autoSaveReference(reference);
    },
    [autoSaveReference],
  );

  const autoSaveContent = useCallback(async () => {
    const current = formRef.current;
    const content = current.content.trim();
    if (!canPersistResource(current)) return;
    if (lastSavedContentRef.current === content) return;

    const resourceId = editingIdRef.current;

    try {
      setSaving(true);

      if (resourceId !== null) {
        const { error: updateError } = await supabase
          .from('franchise_resources')
          .update({ content: content || null })
          .eq('id', resourceId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('franchise_resources')
          .insert(buildResourcePayload(current))
          .select('id')
          .single();

        if (insertError) throw insertError;

        editingIdRef.current = data.id;
        setEditingId(data.id);
        setSlugTouched(true);
      }

      lastSavedContentRef.current = content;
      await loadResources();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to auto-save content.',
      );
    } finally {
      setSaving(false);
    }
  }, [loadResources]);

  const handleContentChange = useCallback(
    (content: string) => {
      setForm((current) => {
        const next = { ...current, content };
        formRef.current = next;
        return next;
      });

      clearContentAutoSaveTimer();
      contentSaveTimerRef.current = setTimeout(() => {
        void autoSaveContent();
      }, CONTENT_AUTO_SAVE_MS);
    },
    [autoSaveContent, clearContentAutoSaveTimer],
  );

  useEffect(() => {
    if (!dialogOpen) clearContentAutoSaveTimer();
  }, [clearContentAutoSaveTimer, dialogOpen]);

  useEffect(() => () => clearContentAutoSaveTimer(), [clearContentAutoSaveTimer]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!form.slug.trim()) {
      toast.error('Slug is required.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      toast.error('Slug must be lowercase kebab-case.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildResourcePayload(form);

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('franchise_resources')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        toast.success('Document updated.');
      } else {
        const { error: insertError } = await supabase
          .from('franchise_resources')
          .insert(payload);

        if (insertError) throw insertError;
        toast.success('Document created.');
      }

      lastSavedContentRef.current = form.content.trim();
      clearContentAutoSaveTimer();
      setDialogOpen(false);
      await loadResources();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save document.',
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
        .from('franchise_resources')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteError) throw deleteError;
      toast.success('Document deleted.');
      setDeleteTarget(null);
      await loadResources();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete document.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Resources Hub">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Resources Hub">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage franchise documents.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Resources Hub">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Franchise documents
              </CardTitle>
              <CardDescription>
                Manage document resources shown in the franchise Resources Hub.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadResources()}
                disabled={loading}
              />
              <Button onClick={openCreate} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add document
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Input
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredResources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents yet. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <SortableHeader
                        label="ID"
                        column="id"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Title"
                        column="title"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Slug"
                        column="slug"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Published
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                          {row.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {row.title}
                          {row.is_mandatory ? (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Mandatory
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.slug}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.category_id != null
                            ? taxonomyLabelById.get(row.category_id) ?? row.category_id
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.published_at
                            ? new Date(row.published_at).toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={row.is_published ? 'default' : 'secondary'}
                          >
                            {row.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(row)}
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
        <DialogContent className="fixed inset-0 top-0 left-0 z-50 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-lg sm:max-w-none">
          <div
            className={cn(
              'shrink-0 border-b bg-gradient-to-r from-sky-500/15 via-sky-400/5 to-transparent px-6 py-5',
            )}
          >
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Document
                </Badge>
                {form.is_published ? (
                  <Badge className="border-emerald-200 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200">
                    Published
                  </Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
                {form.is_featured ? (
                  <Badge className="gap-1 border-amber-200 bg-amber-500/15 text-amber-900 hover:bg-amber-500/15 dark:text-amber-200">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                ) : null}
                {form.is_mandatory ? (
                  <Badge variant="outline" className="border-rose-300 text-rose-700 dark:text-rose-300">
                    Mandatory
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="text-xl">
                {editingId !== null ? 'Edit document' : 'Add document'}
              </DialogTitle>
              {form.title.trim() ? (
                <p className="text-sm font-medium text-foreground/80">{form.title}</p>
              ) : null}
              <DialogDescription>
                Document resources are visible to franchise members when published
                and within their effective dates.
              </DialogDescription>
            </DialogHeader>
          </div>

          <Tabs
            value={editorTab}
            onValueChange={(value) => setEditorTab(value as EditorTab)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="shrink-0 border-b bg-muted/20 px-6 py-3">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-background/60 p-1.5 shadow-xs">
                <TabsTrigger
                  value="main"
                  className="gap-2 data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-900 dark:data-[state=active]:text-sky-100"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Main
                </TabsTrigger>
                <TabsTrigger
                  value="content"
                  className="gap-2 data-[state=active]:bg-orange-500/15 data-[state=active]:text-orange-900 dark:data-[state=active]:text-orange-100"
                >
                  <FileText className="h-4 w-4" />
                  Content
                  {form.reference.uploaded.length > 0 ? (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {form.reference.uploaded.length} asset
                      {form.reference.uploaded.length === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="gap-2 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-900 dark:data-[state=active]:text-indigo-100"
                >
                  <Upload className="h-4 w-4" />
                  Upload files
                  {form.attached_files.length > 0 || form.content_file ? (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {form.attached_files.length + (form.content_file ? 1 : 0)}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="main" className={tabPanelScrollClass}>
              <div className="flex w-full flex-col gap-6 px-6 py-5">
                <ResourceFormSection
                  title="Identity"
                  description="Core details shown in resource lists and detail pages."
                  accentClass={SECTION_ACCENTS.identity}
                >
                  <div className={formGridClass}>
                    <ResourceFormField label="Thumbnail" className="md:col-span-2 xl:col-span-3">
                      <ImageUpload
                        description="JPEG, PNG, WebP or GIF. Stored as public URL."
                        value={thumbnailPreviewUrl ?? form.thumbnail_url ?? null}
                        onFileSelect={handleThumbnailUpload}
                        onClear={form.thumbnail_url ? handleThumbnailClear : undefined}
                        isUploading={isUploading}
                        disabled={saving}
                        shape="square"
                      />
                    </ResourceFormField>

                    <ResourceFormField label="Title" htmlFor="doc-title">
                      <Input
                        id="doc-title"
                        value={form.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                      />
                    </ResourceFormField>

                    <ResourceFormField
                      label="Slug"
                      htmlFor="doc-slug"
                      description="Lowercase URL segment, e.g. operation-manual-v1"
                    >
                      <Input
                        id="doc-slug"
                        value={form.slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setForm((current) => ({
                            ...current,
                            slug: e.target.value,
                          }));
                        }}
                        placeholder="operation-manual-v1"
                      />
                    </ResourceFormField>

                    <ResourceFormField label="Author" htmlFor="doc-author">
                      <Input
                        id="doc-author"
                        value={form.author_name}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            author_name: e.target.value,
                          }))
                        }
                        placeholder="Franchise HQ"
                      />
                    </ResourceFormField>

                    <ResourceFormField
                      label="Description"
                      htmlFor="doc-description"
                      className="md:col-span-2 xl:col-span-3"
                    >
                      <Textarea
                        id="doc-description"
                        rows={3}
                        value={form.description}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Brief overview of this document…"
                      />
                    </ResourceFormField>
                  </div>
                </ResourceFormSection>

                <ResourceFormSection
                  title="Classification"
                  description="Organise documents by category, course, and period."
                  accentClass={SECTION_ACCENTS.classification}
                >
                  <div className={formGridClass}>
                    <ResourceFormField label="Category" htmlFor="doc-category">
                      <Select
                        value={form.category_id || 'none'}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            category_id: value === 'none' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger id="doc-category">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {taxonomyByKind.category.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ResourceFormField>

                    <ResourceFormField label="Course" htmlFor="doc-course">
                      <Select
                        value={form.course_id || 'none'}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            course_id: value === 'none' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger id="doc-course">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {taxonomyByKind.course.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ResourceFormField>

                    <ResourceFormField label="Period" htmlFor="doc-period">
                      <Select
                        value={form.period_id || 'none'}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            period_id: value === 'none' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger id="doc-period">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {taxonomyByKind.period.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ResourceFormField>

                    <ResourceFormField
                      label="Tags"
                      htmlFor="doc-tags"
                      description="Comma-separated labels for filtering"
                    >
                      <Input
                        id="doc-tags"
                        value={form.tags}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, tags: e.target.value }))
                        }
                        placeholder="manual, operations, safety"
                      />
                    </ResourceFormField>
                  </div>
                </ResourceFormSection>

                <ResourceFormSection
                  title="Publishing"
                  description="Control when and how members see this document."
                  accentClass={SECTION_ACCENTS.publishing}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div className={formGridClass}>
                      <ResourceFormField label="Published at" htmlFor="doc-published">
                        <Input
                          id="doc-published"
                          type="datetime-local"
                          value={form.published_at}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              published_at: e.target.value,
                            }))
                          }
                        />
                      </ResourceFormField>

                      <ResourceFormField label="Effective from" htmlFor="doc-effective-from">
                        <Input
                          id="doc-effective-from"
                          type="datetime-local"
                          value={form.effective_from}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              effective_from: e.target.value,
                            }))
                          }
                        />
                      </ResourceFormField>

                      <ResourceFormField label="Effective until" htmlFor="doc-effective-until">
                        <Input
                          id="doc-effective-until"
                          type="datetime-local"
                          value={form.effective_until}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              effective_until: e.target.value,
                            }))
                          }
                        />
                      </ResourceFormField>

                      <ResourceFormField label="External URL" htmlFor="doc-external-url">
                        <Input
                          id="doc-external-url"
                          value={form.external_url}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              external_url: e.target.value,
                            }))
                          }
                          placeholder="https://…"
                        />
                      </ResourceFormField>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <ResourceToggleField
                        label="Published"
                        description="Visible to franchise members"
                        checked={form.is_published}
                        tone="published"
                        onChange={(checked) =>
                          setForm((current) => ({ ...current, is_published: checked }))
                        }
                      />
                      <ResourceToggleField
                        label="Featured"
                        description="Highlight in resource lists"
                        checked={form.is_featured}
                        tone="featured"
                        onChange={(checked) =>
                          setForm((current) => ({ ...current, is_featured: checked }))
                        }
                      />
                      <ResourceToggleField
                        label="Mandatory"
                        description="Members must complete this resource"
                        checked={form.is_mandatory}
                        tone="mandatory"
                        onChange={(checked) =>
                          setForm((current) => ({ ...current, is_mandatory: checked }))
                        }
                      />
                      <ResourceToggleField
                        label="Requires acknowledgement"
                        description="Member must confirm they have read it"
                        checked={form.requires_acknowledgement}
                        tone="ack"
                        onChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            requires_acknowledgement: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </ResourceFormSection>

                <ResourceFormSection
                  title="Metadata"
                  description="Optional display and ordering fields."
                  accentClass={SECTION_ACCENTS.metadata}
                >
                  <div className={formGridClass}>
                    <ResourceFormField label="Version" htmlFor="doc-version">
                      <Input
                        id="doc-version"
                        value={form.version}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            version: e.target.value,
                          }))
                        }
                        placeholder="1.0"
                      />
                    </ResourceFormField>

                    <ResourceFormField label="Icon" htmlFor="doc-icon">
                      <Input
                        id="doc-icon"
                        value={form.icon}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, icon: e.target.value }))
                        }
                        placeholder="file-text"
                      />
                    </ResourceFormField>

                    <ResourceFormField label="Sort order" htmlFor="doc-sort">
                      <Input
                        id="doc-sort"
                        type="number"
                        min={0}
                        value={form.sort_order}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            sort_order: e.target.value,
                          }))
                        }
                      />
                    </ResourceFormField>

                    <ResourceFormField
                      label="Estimated read (minutes)"
                      htmlFor="doc-read-minutes"
                    >
                      <Input
                        id="doc-read-minutes"
                        type="number"
                        min={0}
                        value={form.estimated_read_minutes}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            estimated_read_minutes: e.target.value,
                          }))
                        }
                      />
                    </ResourceFormField>
                  </div>
                </ResourceFormSection>
              </div>
            </TabsContent>

            <TabsContent value="content" className={tabPanelScrollClass}>
              <div className="flex w-full flex-col gap-6 px-6 py-5">
                <ResourceFormSection
                  title="Document body"
                  description="Summary appears in lists; content is the full document."
                  accentClass={SECTION_ACCENTS.content}
                >
                  <div className="mb-4 grid gap-4">
                    <ResourceFormField label="Summary" htmlFor="doc-summary">
                      <Textarea
                        id="doc-summary"
                        rows={3}
                        className="resize-none"
                        value={form.summary}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            summary: e.target.value,
                          }))
                        }
                        placeholder="Short preview shown in resource lists…"
                      />
                    </ResourceFormField>

                    <div className="grid gap-2">
                      <Label>Content format</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {CONTENT_FORMAT_OPTIONS.map((option) => {
                          const selected = form.content_format === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  content_format: option.value,
                                }))
                              }
                              className={cn(
                                'flex flex-col items-start gap-2 rounded-lg border bg-background/80 p-3 text-left transition-all',
                                selected ? option.activeClass : 'border-border/60 hover:bg-muted/30',
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                                  option.badgeClass,
                                )}
                              >
                                {option.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="doc-content">Content</Label>
                    {form.content_format === 'html' ? (
                      <HtmlRichTextEditor
                        key={editingId ?? 'new'}
                        id="doc-content"
                        value={form.content}
                        onChange={handleContentChange}
                        onAssetUploaded={handleAssetUploaded}
                        placeholder="Write the document body…"
                        className="min-h-[320px]"
                      />
                    ) : (
                      <Textarea
                        id="doc-content"
                        className="min-h-[320px] resize-none font-mono text-sm"
                        value={form.content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder={
                          form.content_format === 'markdown'
                            ? 'Markdown content…'
                            : 'Plain text content…'
                        }
                      />
                    )}
                  </div>
                </ResourceFormSection>

                <ResourceFormSection
                  title="Asset references"
                  description="Images uploaded through the content editor. Remove unused files from storage."
                  accentClass={SECTION_ACCENTS.assets}
                >
                  <BlogPostAssetReferencesPanel
                    reference={form.reference}
                    onReferenceChange={(reference) => void handleReferenceChange(reference)}
                  />
                </ResourceFormSection>
              </div>
            </TabsContent>

            <TabsContent value="files" className={tabPanelScrollClass}>
              <div className="flex w-full flex-col gap-6 px-6 py-5">
                <ResourceFormSection
                  title="Primary document file"
                  description="Optional downloadable PDF or document linked from the resource."
                  accentClass={SECTION_ACCENTS.files}
                >
                  <div className="grid gap-4">
                    <ResourceFormField
                      label="File URL"
                      htmlFor="doc-content-file"
                      description="Set manually or upload a file below"
                    >
                      <Input
                        id="doc-content-file"
                        value={form.content_file}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            content_file: e.target.value,
                          }))
                        }
                        className="font-mono text-sm"
                        placeholder="https://…"
                      />
                    </ResourceFormField>

                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/30 px-6 py-8 transition-colors hover:border-indigo-400/60 hover:bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35">
                      <Upload className="h-8 w-8 text-indigo-500/70" />
                      <span className="text-sm font-medium">
                        Upload primary document
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, DOCX, or other downloadable file
                      </span>
                      <Input
                        type="file"
                        disabled={saving || isUploading}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleContentFileUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </ResourceFormSection>

                <ResourceFormSection
                  title="Attachments"
                  description="Additional files members can download alongside this resource."
                  accentClass={SECTION_ACCENTS.attachments}
                >
                  <div className="grid gap-4">
                    {form.attached_files.length > 0 ? (
                      <div className="space-y-2">
                        {form.attached_files.map((file, index) => (
                          <div
                            key={`${file.url}-${index}`}
                            className="flex items-center gap-3 rounded-lg border border-teal-200/60 bg-background p-3 dark:border-teal-900/40"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-500/10">
                              <Paperclip className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{file.name}</p>
                              <p className="truncate font-mono text-xs text-muted-foreground">
                                {file.url}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border-2 border-dashed border-teal-200/60 bg-teal-50/20 px-6 py-8 text-center dark:border-teal-900/40 dark:bg-teal-950/15">
                        <Paperclip className="mx-auto mb-2 h-6 w-6 text-teal-500/70" />
                        <p className="text-sm text-muted-foreground">
                          No attachments yet.
                        </p>
                      </div>
                    )}

                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-200/80 bg-teal-50/30 px-6 py-6 transition-colors hover:border-teal-400/60 hover:bg-teal-50/50 dark:border-teal-900/50 dark:bg-teal-950/20 dark:hover:bg-teal-950/35">
                      <Upload className="h-6 w-6 text-teal-500/70" />
                      <span className="text-sm font-medium">Add attachment</span>
                      <Input
                        type="file"
                        disabled={saving || isUploading}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleAttachmentUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </ResourceFormSection>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="relative z-10 shrink-0 border-t bg-muted/20 px-6 py-4 sm:justify-end">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Save document
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.title}</strong>{' '}
              and member progress records for it. This cannot be undone.
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
