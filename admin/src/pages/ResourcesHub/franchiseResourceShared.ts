import {
  emptyBlogPostReference,
  normalizeBlogPostReference,
  type BlogPostReference,
} from '@/types/BlogPost';
import { FileText, GraduationCap, Megaphone, type LucideIcon } from 'lucide-react';

export const RESOURCE_COLUMNS =
  'id, type, title, slug, category_id, course_id, period_id, author_name, icon, description, summary, content, content_format, attached_files, content_file, video_file, course_duration, version, is_published, is_featured, is_mandatory, requires_acknowledgement, sort_order, tags, external_url, thumbnail_url, estimated_read_minutes, effective_from, effective_until, published_at, reference, created_at, updated_at';

export const CONTENT_AUTO_SAVE_MS = 3000;

export type FranchiseResourceKind = 'document' | 'announcement' | 'menu_training';
export type TaxonomyPlace = 'document' | 'announcement' | 'academy';
export type EditorTab = 'main' | 'content' | 'files';
export type SortColumn = 'id' | 'title' | 'slug';
export type SortDirection = 'asc' | 'desc';

export type TaxonomyOption = {
  id: number;
  kind: 'folder' | 'category' | 'course' | 'period';
  label: string;
  alias: string;
  sort_order?: number;
  created_at?: string;
};

export type AttachedFile = {
  name: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
};

export type FranchiseResourceRow = {
  id: number;
  type: FranchiseResourceKind;
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
  video_file: string | null;
  course_duration: string | null;
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

export type ResourceInput = {
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
  video_file: string;
  course_duration: string;
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

export type TaxonomyListKind = 'category' | 'course' | 'period';

export type FranchiseResourcePageConfig = {
  resourceType: FranchiseResourceKind;
  taxonomyPlace: TaxonomyPlace;
  /** When set, only these taxonomy kinds are loaded from `franchise_resource_taxonomies`. */
  taxonomyKinds?: TaxonomyOption['kind'][];
  /** Taxonomy kind used for the list filter and editor folder/category field. */
  listFilterTaxonomyKind?: 'folder' | 'category';
  /** Table columns for category, course, and period taxonomies. */
  listTableTaxonomyColumns?: TaxonomyListKind[];
  /** Toolbar filters for category, course, and period taxonomies. */
  listTaxonomyFilters?: TaxonomyListKind[];
  /** Taxonomy fields hidden in the editor classification section. */
  hiddenEditorTaxonomyKinds?: TaxonomyListKind[];
  /** Show thumbnail beside title in the admin list table. */
  showTitleThumbnail?: boolean;
  /** Show preview action to open course content in a dialog. */
  enableContentPreview?: boolean;
  /** Show folder import button for bulk document uploads from local directories. */
  enableFolderImport?: boolean;
  uploadFolder: string;
  labels: {
    singular: string;
    plural: string;
    pageTitle: string;
    listTitle: string;
    listDescription: string;
    addButton: string;
    importFolderButton?: string;
    editTitle: string;
    addTitle: string;
    saveButton: string;
    deleteTitle: string;
    searchPlaceholder: string;
    emptyAll: string;
    emptyFiltered: string;
    createdToast: string;
    updatedToast: string;
    deletedToast: string;
    adminRequiredDescription: string;
    editorDescription: string;
    deleteDescription: string;
    loadError: string;
    saveError: string;
    deleteError: string;
  };
  theme: {
    badgeClass: string;
    headerGradient: string;
    tabMainActive: string;
    icon: LucideIcon;
  };
};

export const DOCUMENT_PAGE_CONFIG: FranchiseResourcePageConfig = {
  resourceType: 'document',
  taxonomyPlace: 'document',
  taxonomyKinds: ['category'],
  listFilterTaxonomyKind: 'category',
  listTableTaxonomyColumns: ['category'],
  enableContentPreview: true,
  enableFolderImport: true,
  uploadFolder: 'franchise-documents',
  labels: {
    singular: 'Document',
    plural: 'documents',
    pageTitle: 'Resources Hub',
    listTitle: 'Franchise documents',
    listDescription:
      'Manage document resources shown in the franchise Resources Hub.',
    addButton: 'Add document',
    importFolderButton: 'Import folder',
    editTitle: 'Edit document',
    addTitle: 'Add document',
    saveButton: 'Save document',
    deleteTitle: 'Delete document?',
    searchPlaceholder: 'Search documents…',
    emptyAll: 'No documents yet. Add one to get started.',
    emptyFiltered: 'No documents match your search or category filter.',
    createdToast: 'Document created.',
    updatedToast: 'Document updated.',
    deletedToast: 'Document deleted.',
    adminRequiredDescription:
      'Only administrators can manage franchise documents.',
    editorDescription:
      'Document resources are visible to franchise members when published and within their effective dates.',
    deleteDescription:
      'and member progress records for it. This cannot be undone.',
    loadError: 'Failed to load documents.',
    saveError: 'Failed to save document.',
    deleteError: 'Failed to delete document.',
  },
  theme: {
    badgeClass:
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
    headerGradient: 'from-sky-500/15 via-sky-400/5 to-transparent',
    tabMainActive:
      'data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-900 dark:data-[state=active]:text-sky-100',
    icon: FileText,
  },
};

export const MENU_ACADEMY_PAGE_CONFIG: FranchiseResourcePageConfig = {
  resourceType: 'menu_training',
  taxonomyPlace: 'academy',
  taxonomyKinds: ['category', 'course', 'period'],
  listTableTaxonomyColumns: ['course', 'period'],
  listTaxonomyFilters: ['course', 'period'],
  hiddenEditorTaxonomyKinds: ['category'],
  showTitleThumbnail: true,
  enableContentPreview: true,
  uploadFolder: 'franchise-menu-academy',
  labels: {
    singular: 'Menu Academy item',
    plural: 'menu academy items',
    pageTitle: 'Menu Academy',
    listTitle: 'Menu Academy',
    listDescription:
      'Manage menu training resources shown in the franchise Resources Hub.',
    addButton: 'Add item',
    editTitle: 'Edit menu academy item',
    addTitle: 'Add menu academy item',
    saveButton: 'Save item',
    deleteTitle: 'Delete menu academy item?',
    searchPlaceholder: 'Search menu academy…',
    emptyAll: 'No menu academy items yet. Add one to get started.',
    emptyFiltered: 'No items match your search or filters.',
    createdToast: 'Menu academy item created.',
    updatedToast: 'Menu academy item updated.',
    deletedToast: 'Menu academy item deleted.',
    adminRequiredDescription:
      'Only administrators can manage menu academy resources.',
    editorDescription:
      'Menu academy resources are visible to franchise members when published and within their effective dates.',
    deleteDescription:
      'and member progress records for it. This cannot be undone.',
    loadError: 'Failed to load menu academy items.',
    saveError: 'Failed to save menu academy item.',
    deleteError: 'Failed to delete menu academy item.',
  },
  theme: {
    badgeClass:
      'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-200',
    headerGradient: 'from-violet-500/15 via-violet-400/5 to-transparent',
    tabMainActive:
      'data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-900 dark:data-[state=active]:text-violet-100',
    icon: GraduationCap,
  },
};

export const ANNOUNCEMENT_PAGE_CONFIG: FranchiseResourcePageConfig = {
  resourceType: 'announcement',
  taxonomyPlace: 'announcement',
  taxonomyKinds: ['folder'],
  listFilterTaxonomyKind: 'folder',
  enableContentPreview: true,
  uploadFolder: 'franchise-announcements',
  labels: {
    singular: 'Announcement',
    plural: 'announcements',
    pageTitle: 'Announcements',
    listTitle: 'Franchise announcements',
    listDescription:
      'Manage announcements shown in the franchise Resources Hub.',
    addButton: 'Add announcement',
    editTitle: 'Edit announcement',
    addTitle: 'Add announcement',
    saveButton: 'Save announcement',
    deleteTitle: 'Delete announcement?',
    searchPlaceholder: 'Search announcements…',
    emptyAll: 'No announcements yet. Add one to get started.',
    emptyFiltered: 'No announcements match your search or category filter.',
    createdToast: 'Announcement created.',
    updatedToast: 'Announcement updated.',
    deletedToast: 'Announcement deleted.',
    adminRequiredDescription:
      'Only administrators can manage franchise announcements.',
    editorDescription:
      'Announcements are visible to franchise members when published and within their effective dates.',
    deleteDescription:
      'and member progress records for it. This cannot be undone.',
    loadError: 'Failed to load announcements.',
    saveError: 'Failed to save announcement.',
    deleteError: 'Failed to delete announcement.',
  },
  theme: {
    badgeClass:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200',
    headerGradient: 'from-rose-500/15 via-rose-400/5 to-transparent',
    tabMainActive:
      'data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-900 dark:data-[state=active]:text-rose-100',
    icon: Megaphone,
  },
};

export const CONTENT_FORMAT_OPTIONS: {
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

export function emptyResourceInput(
  resourceType?: FranchiseResourceKind,
): ResourceInput {
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
    video_file: '',
    course_duration: resourceType === 'menu_training' ? '30' : '',
    version: '',
    is_published:
      resourceType === 'document' || resourceType === 'menu_training',
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
    published_at:
      resourceType === 'menu_training'
        ? toDatetimeLocalValue(new Date().toISOString())
        : '',
    reference: emptyBlogPostReference(),
  };
}

export function defaultNewestPeriodId(periods: TaxonomyOption[]): string {
  if (periods.length === 0) return '';

  const newest = periods.reduce((latest, current) => {
    if (latest.created_at && current.created_at) {
      return current.created_at > latest.created_at ? current : latest;
    }

    return current.id > latest.id ? current : latest;
  });

  return String(newest.id);
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  if (!base) return fileName.trim();
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resourceListDisplayTitle(
  row: Pick<FranchiseResourceRow, 'title' | 'slug'>,
): string {
  const trimmedTitle = row.title.trim();
  if (trimmedTitle) return trimmedTitle;

  const tail = row.slug.split('-').pop();
  if (!tail) return row.slug;
  return titleFromFileName(`${tail}.txt`) || row.slug;
}

function stripHtmlForExcerpt(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function resourceDescriptionExcerpt(
  description: string | null | undefined,
  maxLength = 120,
): string | null {
  if (!description?.trim()) return null;
  const plain = stripHtmlForExcerpt(description);
  if (!plain) return null;
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
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

function intervalToDurationMinutes(value: string | null): string {
  if (!value?.trim()) return '';
  const trimmed = value.trim();
  const timeMatch = trimmed.match(/^(\d+):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return String(
      Number.parseInt(timeMatch[1], 10) * 60 +
        Number.parseInt(timeMatch[2], 10),
    );
  }
  const hoursMatch = trimmed.match(/(\d+)\s*hours?/i);
  const minsMatch = trimmed.match(/(\d+)\s*mins?(?:utes?)?/i);
  let total = 0;
  if (hoursMatch) total += Number.parseInt(hoursMatch[1], 10) * 60;
  if (minsMatch) total += Number.parseInt(minsMatch[1], 10);
  return total > 0 ? String(total) : '';
}

function durationMinutesToInterval(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const totalMinutes = Number.parseInt(trimmed, 10);
  if (Number.isNaN(totalMinutes) || totalMinutes < 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:00`;
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

export function normalizeResourceRow(
  row: Record<string, unknown>,
  resourceType: FranchiseResourceKind,
): FranchiseResourceRow {
  const referenceRaw = row.reference ?? row.metadata;
  let reference = emptyBlogPostReference();
  if (referenceRaw && typeof referenceRaw === 'object' && !Array.isArray(referenceRaw)) {
    reference = normalizeBlogPostReference(referenceRaw);
  }

  return {
    id: row.id as number,
    type: resourceType,
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
    video_file: (row.video_file as string | null) ?? null,
    course_duration: (row.course_duration as string | null) ?? null,
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

export function rowToInput(row: FranchiseResourceRow): ResourceInput {
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
    video_file: row.video_file ?? '',
    course_duration: intervalToDurationMinutes(row.course_duration),
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

export function resolveResourceSlug(form: ResourceInput): string {
  const explicit = form.slug.trim();
  if (explicit) return explicit;
  return slugify(form.title);
}

export function canPersistResource(form: ResourceInput): boolean {
  const slug = resolveResourceSlug(form);
  return (
    Boolean(form.title.trim()) &&
    Boolean(slug) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

export function buildResourcePayload(
  form: ResourceInput,
  resourceType: FranchiseResourceKind,
) {
  const sortOrder = Number.parseInt(form.sort_order, 10);
  const readMinutes = form.estimated_read_minutes.trim()
    ? Number.parseInt(form.estimated_read_minutes, 10)
    : null;

  return {
    type: resourceType,
    title: form.title.trim(),
    slug: resolveResourceSlug(form),
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
    video_file: form.video_file.trim() || null,
    course_duration: durationMinutesToInterval(form.course_duration),
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

export function resolveImagePreview(
  imageUrl: string | null | undefined,
  getPublicUrl: (path: string) => string,
): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return getPublicUrl(value);
}

export function hasPreviewableResourceContent(
  row: Pick<FranchiseResourceRow, 'content' | 'content_file' | 'video_file'>,
): boolean {
  return Boolean(
    row.content?.trim() ||
      row.content_file?.trim() ||
      row.video_file?.trim(),
  );
}
