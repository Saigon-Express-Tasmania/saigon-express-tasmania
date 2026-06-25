import { BlogPostAssetReferencesPanel } from '@/components/BlogPostAssetReferencesPanel';
import { SearchableSelect } from '@/components/SearchableSelect';
import { FileDropzone } from '@/components/FileDropzone';
import { HtmlRichTextEditor } from '@/components/HtmlRichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Loader2,
  Paperclip,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  CONTENT_FORMAT_OPTIONS,
  slugify,
  type EditorTab,
  type FranchiseResourcePageConfig,
  type ResourceInput,
  type TaxonomyOption,
} from './franchiseResourceShared';

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

function ResourceFormSection({
  title,
  description,
  children,
  className,
  accentClass,
  collapsible = false,
  defaultExpanded = true,
  headerExtra,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  accentClass?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  headerExtra?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const sectionClassName = cn(
    'rounded-xl border p-4 shadow-xs',
    accentClass ?? 'border-border/70 bg-muted/20',
    className,
  );

  const header = (
    <>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {headerExtra}
    </>
  );

  if (collapsible) {
    return (
      <section className={sectionClassName}>
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1 border-b border-border/40 pb-3">
            {header}
          </div>
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {expanded ? <div className="pt-4">{children}</div> : null}
      </section>
    );
  }

  return (
    <section className={sectionClassName}>
      <div className="mb-4 border-b border-border/40 pb-3">{header}</div>
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

export type FranchiseResourceEditorDialogProps = {
  config: FranchiseResourcePageConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  form: ResourceInput;
  setForm: React.Dispatch<React.SetStateAction<ResourceInput>>;
  thumbnailPreviewUrl: string | null;
  editorTab: EditorTab;
  onEditorTabChange: (tab: EditorTab) => void;
  saving: boolean;
  isUploading: boolean;
  taxonomyByKind: {
    folder: TaxonomyOption[];
    category: TaxonomyOption[];
    course: TaxonomyOption[];
    period: TaxonomyOption[];
  };
  idPrefix: string;
  onTitleChange: (title: string) => void;
  onThumbnailUpload: (file: File | File[]) => Promise<void>;
  onThumbnailClear: () => void;
  onContentFileUpload: (file: File) => Promise<void>;
  onVideoFileUpload: (file: File) => Promise<void>;
  onAttachmentUpload: (file: File) => Promise<void>;
  onRemoveAttachment: (index: number) => void;
  onContentChange: (content: string) => void;
  onAssetUploaded: (
    asset: { path: string; publicUrl: string; fileName: string },
    contentHtml: string,
  ) => Promise<void>;
  onReferenceChange: (reference: ResourceInput['reference']) => Promise<void>;
  onSave: () => void;
};

export function FranchiseResourceEditorDialog({
  config,
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  thumbnailPreviewUrl,
  editorTab,
  onEditorTabChange,
  saving,
  isUploading,
  taxonomyByKind,
  idPrefix,
  onTitleChange,
  onThumbnailUpload,
  onThumbnailClear,
  onContentFileUpload,
  onVideoFileUpload,
  onAttachmentUpload,
  onRemoveAttachment,
  onContentChange,
  onAssetUploaded,
  onReferenceChange,
  onSave,
}: FranchiseResourceEditorDialogProps) {
  const { labels, theme, resourceType } = config;
  const isDocument = resourceType === 'document';
  const isAnnouncement = resourceType === 'announcement';
  const isMenuAcademy = resourceType === 'menu_training';
  const hideThumbnail = isDocument || isAnnouncement;
  const hideClassification = isDocument || isAnnouncement;
  const hidePublishing = isDocument || isAnnouncement;
  const hideFilesTab = isDocument || isAnnouncement || isMenuAcademy;
  const TypeIcon = theme.icon;

  const filesTabCount =
    hideFilesTab
      ? 0
      : form.attached_files.length + (form.content_file ? 1 : 0);

  const categoryOptions = useMemo(
    () =>
      taxonomyByKind.category.map((option) => ({
        value: String(option.id),
        label: option.label,
      })),
    [taxonomyByKind.category],
  );

  const folderOptions = useMemo(
    () =>
      taxonomyByKind.folder.map((option) => ({
        value: String(option.id),
        label: option.label,
      })),
    [taxonomyByKind.folder],
  );

  const courseOptions = useMemo(
    () =>
      taxonomyByKind.course.map((option) => ({
        value: String(option.id),
        label: option.label,
      })),
    [taxonomyByKind.course],
  );

  const periodOptions = useMemo(
    () =>
      taxonomyByKind.period.map((option) => ({
        value: String(option.id),
        label: option.label,
      })),
    [taxonomyByKind.period],
  );

  const titleSlug = slugify(form.title);

  const attachmentsSection = (
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
                  onClick={() => onRemoveAttachment(index)}
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
              No attachments yet. Drag files into the upload area below.
            </p>
          </div>
        )}

        <FileDropzone
          title="Add attachment"
          description="Upload one or more supporting files"
          icon={<Upload className="h-6 w-6 text-teal-500/70" />}
          className="border-teal-200/80 bg-teal-50/30 py-6 hover:border-teal-400/60 hover:bg-teal-50/50 dark:border-teal-900/50 dark:bg-teal-950/20 dark:hover:bg-teal-950/35"
          disabled={saving}
          isUploading={isUploading}
          multiple
          onFileSelect={onAttachmentUpload}
        />
      </div>
    </ResourceFormSection>
  );

  const bodyAndReferencesSections = (
    <>
      <ResourceFormSection
        title="Body"
        description="Summary appears in lists; content is the full resource."
        accentClass={SECTION_ACCENTS.content}
      >
        <div className="mb-4 grid gap-4">
          <ResourceFormField label="Summary" htmlFor={`${idPrefix}-summary`}>
            <Textarea
              id={`${idPrefix}-summary`}
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
          <Label htmlFor={`${idPrefix}-content`}>Content</Label>
          {form.content_format === 'html' ? (
            <HtmlRichTextEditor
              key={editingId ?? 'new'}
              id={`${idPrefix}-content`}
              value={form.content}
              onChange={onContentChange}
              onAssetUploaded={onAssetUploaded}
              placeholder={`Write the ${labels.singular.toLowerCase()} body…`}
              className="min-h-[320px]"
            />
          ) : (
            <Textarea
              id={`${idPrefix}-content`}
              className="min-h-[320px] resize-none font-mono text-sm"
              value={form.content}
              onChange={(e) => onContentChange(e.target.value)}
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
        key={`asset-refs-${String(open)}-${editingId ?? 'new'}`}
        title="Asset references"
        description="Images uploaded through the content editor. Remove unused files from storage."
        accentClass={SECTION_ACCENTS.assets}
        collapsible
        defaultExpanded={false}
        headerExtra={
          form.reference.uploaded.length > 0 ? (
            <p className="mt-1 text-xs font-medium text-foreground">
              {form.reference.uploaded.length} asset
              {form.reference.uploaded.length === 1 ? '' : 's'}
            </p>
          ) : null
        }
      >
        <BlogPostAssetReferencesPanel
          reference={form.reference}
          onReferenceChange={(reference) => void onReferenceChange(reference)}
        />
      </ResourceFormSection>

      {isMenuAcademy ? attachmentsSection : null}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 top-0 left-0 z-50 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-lg sm:max-w-none">
        <div
          className={cn(
            'shrink-0 border-b bg-gradient-to-r px-6 py-5',
            theme.headerGradient,
          )}
        >
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('gap-1.5', theme.badgeClass)}>
                <TypeIcon className="h-3.5 w-3.5" />
                {labels.singular}
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
              {editingId !== null ? labels.editTitle : labels.addTitle}
            </DialogTitle>
            {form.title.trim() ? (
              <p className="text-sm font-medium text-foreground/80">{form.title}</p>
            ) : null}
            <DialogDescription>{labels.editorDescription}</DialogDescription>
          </DialogHeader>
        </div>

        <Tabs
          value={isAnnouncement ? 'main' : editorTab}
          onValueChange={(value) => {
            if (!isAnnouncement) {
              onEditorTabChange(value as EditorTab);
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          {!isAnnouncement ? (
          <div className="shrink-0 border-b bg-muted/20 px-6 py-3">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 bg-background/60 p-1.5 shadow-xs">
              <TabsTrigger
                value="main"
                className={cn('gap-2', theme.tabMainActive)}
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
              {!hideFilesTab ? (
              <TabsTrigger
                value="files"
                className="gap-2 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-900 dark:data-[state=active]:text-indigo-100"
              >
                <Upload className="h-4 w-4" />
                Upload files
                {filesTabCount > 0 ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {filesTabCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
              ) : null}
            </TabsList>
          </div>
          ) : null}

          <TabsContent value="main" className={tabPanelScrollClass}>
            <div className="flex w-full flex-col gap-6 px-6 py-5">
              <ResourceFormSection
                title="Identity"
                description="Core details shown in resource lists and detail pages."
                accentClass={SECTION_ACCENTS.identity}
              >
                <div className={formGridClass}>
                  {!hideThumbnail ? (
                    <ResourceFormField label="Thumbnail" className="md:col-span-2 xl:col-span-3">
                      <ImageUpload
                        description="JPEG, PNG, WebP or GIF. Stored as public URL."
                        value={thumbnailPreviewUrl ?? form.thumbnail_url ?? null}
                        onFileSelect={onThumbnailUpload}
                        onClear={form.thumbnail_url ? onThumbnailClear : undefined}
                        isUploading={isUploading}
                        disabled={saving}
                        shape="square"
                      />
                    </ResourceFormField>
                  ) : null}

                  <ResourceFormField
                    label="Title"
                    htmlFor={`${idPrefix}-title`}
                    className={
                      isDocument || isAnnouncement
                        ? 'md:col-span-2 xl:col-span-3'
                        : undefined
                    }
                  >
                    <Input
                      id={`${idPrefix}-title`}
                      value={form.title}
                      onChange={(e) => onTitleChange(e.target.value)}
                    />
                    <p className="font-mono text-xs text-muted-foreground">
                      {titleSlug || 'Slug auto-generated from title'}
                    </p>
                  </ResourceFormField>

                  {isDocument ? (
                    <>
                      <ResourceFormField label="Category">
                        <SearchableSelect
                          id={`${idPrefix}-category`}
                          value={form.category_id}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              category_id: value,
                            }))
                          }
                          options={categoryOptions}
                          placeholder="Search categories…"
                          disabled={saving}
                        />
                      </ResourceFormField>

                      <ResourceFormField label="Author" htmlFor={`${idPrefix}-author`}>
                        <Input
                          id={`${idPrefix}-author`}
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

                      <ResourceFormField label="Published at" htmlFor={`${idPrefix}-published`}>
                        <Input
                          id={`${idPrefix}-published`}
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
                    </>
                  ) : null}

                  {isAnnouncement ? (
                    <>
                      <ResourceFormField label="Folder">
                        <SearchableSelect
                          id={`${idPrefix}-folder`}
                          value={form.category_id}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              category_id: value,
                            }))
                          }
                          options={folderOptions}
                          placeholder="Search folders…"
                          disabled={saving}
                        />
                      </ResourceFormField>

                      <ResourceFormField label="Author" htmlFor={`${idPrefix}-author`}>
                        <Input
                          id={`${idPrefix}-author`}
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

                      <ResourceFormField label="Published at" htmlFor={`${idPrefix}-published`}>
                        <Input
                          id={`${idPrefix}-published`}
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
                    </>
                  ) : null}

                  {!isDocument && !isAnnouncement ? (
                  <>
                    <ResourceFormField label="Author" htmlFor={`${idPrefix}-author`}>
                      <Input
                        id={`${idPrefix}-author`}
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

                    {isMenuAcademy ? (
                      <>
                        <ResourceFormField label="Published at" htmlFor={`${idPrefix}-published`}>
                          <Input
                            id={`${idPrefix}-published`}
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

                        <ResourceFormField
                          label="Course duration"
                          htmlFor={`${idPrefix}-course-duration`}
                          description="Expected training time in minutes"
                        >
                          <Input
                            id={`${idPrefix}-course-duration`}
                            type="number"
                            min={0}
                            step={1}
                            value={form.course_duration}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                course_duration: e.target.value,
                              }))
                            }
                            placeholder="e.g. 30"
                          />
                        </ResourceFormField>
                      </>
                    ) : null}
                  </>
                  ) : null}

                  <ResourceFormField
                    label="Description"
                    htmlFor={`${idPrefix}-description`}
                    className="md:col-span-2 xl:col-span-3"
                  >
                    <Textarea
                      id={`${idPrefix}-description`}
                      rows={3}
                      value={form.description}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      placeholder={`Brief overview of this ${labels.singular.toLowerCase()}…`}
                    />
                  </ResourceFormField>
                </div>

                {isDocument ? (
                  <div className="mt-4 grid gap-4 border-t border-border/40 pt-4">
                    <ResourceFormField
                      label="Primary document file"
                      htmlFor={`${idPrefix}-content-file`}
                      description="Set manually or upload a file below"
                    >
                      <Input
                        id={`${idPrefix}-content-file`}
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

                    <FileDropzone
                      title="Upload primary document"
                      description="PDF, DOCX, XLSX, or other downloadable file"
                      icon={<Upload className="h-8 w-8 text-indigo-500/70" />}
                      className="border-indigo-200/80 bg-indigo-50/30 hover:border-indigo-400/60 hover:bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35"
                      disabled={saving}
                      isUploading={isUploading}
                      onFileSelect={onContentFileUpload}
                    />

                    <div className="flex justify-end border-t border-border/40 pt-4">
                      <div className="w-full max-w-sm">
                        <ResourceToggleField
                          label="Published"
                          description="Visible to franchise members"
                          checked={form.is_published}
                          tone="published"
                          onChange={(checked) =>
                            setForm((current) => ({ ...current, is_published: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {isAnnouncement ? (
                  <div className="mt-4 flex justify-end border-t border-border/40 pt-4">
                    <div className="w-full max-w-sm">
                      <ResourceToggleField
                        label="Published"
                        description="Visible to franchise members"
                        checked={form.is_published}
                        tone="published"
                        onChange={(checked) =>
                          setForm((current) => ({ ...current, is_published: checked }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </ResourceFormSection>

              {isAnnouncement ? bodyAndReferencesSections : null}

              {isAnnouncement ? (
                <ResourceFormSection
                  title="Attachments"
                  description="Files members can download with this announcement."
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
                              onClick={() => onRemoveAttachment(index)}
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
                          No attachments yet. Drag files into the upload area below.
                        </p>
                      </div>
                    )}

                    <FileDropzone
                      title="Add attachment"
                      description="Upload one or more supporting files"
                      icon={<Upload className="h-6 w-6 text-teal-500/70" />}
                      className="border-teal-200/80 bg-teal-50/30 py-6 hover:border-teal-400/60 hover:bg-teal-50/50 dark:border-teal-900/50 dark:bg-teal-950/20 dark:hover:bg-teal-950/35"
                      disabled={saving}
                      isUploading={isUploading}
                      multiple
                      onFileSelect={onAttachmentUpload}
                    />
                  </div>
                </ResourceFormSection>
              ) : null}

              {!hideClassification ? (
              <ResourceFormSection
                title="Classification"
                description={`Organise ${labels.plural} by category, course, and period.`}
                accentClass={SECTION_ACCENTS.classification}
              >
                {isMenuAcademy ? (
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <ResourceFormField label="Category">
                        <SearchableSelect
                          id={`${idPrefix}-category`}
                          value={form.category_id}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              category_id: value,
                            }))
                          }
                          options={categoryOptions}
                          placeholder="Search categories…"
                          disabled={saving}
                        />
                      </ResourceFormField>

                      <ResourceFormField label="Course">
                        <SearchableSelect
                          id={`${idPrefix}-course`}
                          value={form.course_id}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              course_id: value,
                            }))
                          }
                          options={courseOptions}
                          placeholder="Search courses…"
                          disabled={saving}
                        />
                      </ResourceFormField>

                      <ResourceFormField label="Period">
                        <SearchableSelect
                          id={`${idPrefix}-period`}
                          value={form.period_id}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              period_id: value,
                            }))
                          }
                          options={periodOptions}
                          placeholder="Search periods…"
                          disabled={saving}
                        />
                      </ResourceFormField>
                    </div>

                    <ResourceFormField
                      label="Tags"
                      htmlFor={`${idPrefix}-tags`}
                      description="Comma-separated labels for filtering"
                    >
                      <Input
                        id={`${idPrefix}-tags`}
                        value={form.tags}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, tags: e.target.value }))
                        }
                        placeholder="manual, operations, safety"
                      />
                    </ResourceFormField>

                    <div className="grid gap-4 border-t border-border/40 pt-4">
                      <ResourceFormField
                        label="Training video"
                        htmlFor={`${idPrefix}-video-file`}
                        description="Set manually or upload a video below"
                      >
                        <Input
                          id={`${idPrefix}-video-file`}
                          value={form.video_file}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              video_file: e.target.value,
                            }))
                          }
                          className="font-mono text-sm"
                          placeholder="https://…"
                        />
                      </ResourceFormField>

                      <FileDropzone
                        title="Upload training video"
                        description="MP4, WebM, or other video format"
                        icon={<Upload className="h-8 w-8 text-violet-500/70" />}
                        className="border-violet-200/80 bg-violet-50/30 hover:border-violet-400/60 hover:bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20 dark:hover:bg-violet-950/35"
                        disabled={saving}
                        isUploading={isUploading}
                        onFileSelect={onVideoFileUpload}
                      />
                    </div>

                    <div className="grid gap-4 border-t border-border/40 pt-4">
                      <ResourceFormField
                        label="Primary file"
                        htmlFor={`${idPrefix}-content-file`}
                        description="Set manually or upload a file below"
                      >
                        <Input
                          id={`${idPrefix}-content-file`}
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

                      <FileDropzone
                        title="Upload primary file"
                        description="PDF, DOCX, XLSX, or other downloadable file"
                        icon={<Upload className="h-8 w-8 text-indigo-500/70" />}
                        className="border-indigo-200/80 bg-indigo-50/30 hover:border-indigo-400/60 hover:bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35"
                        disabled={saving}
                        isUploading={isUploading}
                        onFileSelect={onContentFileUpload}
                      />
                    </div>
                  </div>
                ) : (
                <div className={formGridClass}>
                  <ResourceFormField
                    label="Category"
                    className="md:col-span-2 xl:col-span-3"
                  >
                    <SearchableSelect
                      id={`${idPrefix}-category`}
                      value={form.category_id}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          category_id: value,
                        }))
                      }
                      options={categoryOptions}
                      placeholder="Search categories…"
                      disabled={saving}
                    />
                  </ResourceFormField>

                  <ResourceFormField label="Course" htmlFor={`${idPrefix}-course`}>
                    <Select
                      value={form.course_id || 'none'}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          course_id: value === 'none' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id={`${idPrefix}-course`}>
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

                  <ResourceFormField label="Period" htmlFor={`${idPrefix}-period`}>
                    <Select
                      value={form.period_id || 'none'}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          period_id: value === 'none' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger id={`${idPrefix}-period`}>
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
                    htmlFor={`${idPrefix}-tags`}
                    description="Comma-separated labels for filtering"
                  >
                    <Input
                      id={`${idPrefix}-tags`}
                      value={form.tags}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, tags: e.target.value }))
                      }
                      placeholder="manual, operations, safety"
                    />
                  </ResourceFormField>
                </div>
                )}
              </ResourceFormSection>
              ) : null}

              {!hidePublishing ? (
              <ResourceFormSection
                title="Publishing"
                description={`Control when and how members see this ${labels.singular.toLowerCase()}.`}
                accentClass={SECTION_ACCENTS.publishing}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  {!isMenuAcademy ? (
                  <div className={formGridClass}>
                    <ResourceFormField label="Published at" htmlFor={`${idPrefix}-published`}>
                      <Input
                        id={`${idPrefix}-published`}
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

                    <ResourceFormField label="Effective from" htmlFor={`${idPrefix}-effective-from`}>
                      <Input
                        id={`${idPrefix}-effective-from`}
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

                    <ResourceFormField label="Effective until" htmlFor={`${idPrefix}-effective-until`}>
                      <Input
                        id={`${idPrefix}-effective-until`}
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

                    <ResourceFormField label="External URL" htmlFor={`${idPrefix}-external-url`}>
                      <Input
                        id={`${idPrefix}-external-url`}
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
                  ) : null}

                  <div className={cn('grid gap-2 sm:grid-cols-2', isMenuAcademy && 'lg:col-span-2')}>
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
              ) : null}

              <ResourceFormSection
                title="Metadata"
                description="Optional display and ordering fields."
                accentClass={SECTION_ACCENTS.metadata}
              >
                <div className={formGridClass}>
                  <ResourceFormField label="Version" htmlFor={`${idPrefix}-version`}>
                    <Input
                      id={`${idPrefix}-version`}
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

                  <ResourceFormField label="Icon" htmlFor={`${idPrefix}-icon`}>
                    <Input
                      id={`${idPrefix}-icon`}
                      value={form.icon}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, icon: e.target.value }))
                      }
                      placeholder="file-text"
                    />
                  </ResourceFormField>

                  <ResourceFormField label="Sort order" htmlFor={`${idPrefix}-sort`}>
                    <Input
                      id={`${idPrefix}-sort`}
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
                    htmlFor={`${idPrefix}-read-minutes`}
                  >
                    <Input
                      id={`${idPrefix}-read-minutes`}
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

          {!isAnnouncement ? (
          <TabsContent value="content" className={tabPanelScrollClass}>
            <div className="flex w-full flex-col gap-6 px-6 py-5">
              {bodyAndReferencesSections}
            </div>
          </TabsContent>
          ) : null}

          {!hideFilesTab ? (
          <TabsContent value="files" className={tabPanelScrollClass}>
            <div className="flex w-full flex-col gap-6 px-6 py-5">
              {!isDocument && !isMenuAcademy ? (
              <ResourceFormSection
                title="Primary file"
                description="Optional downloadable file linked from the resource."
                accentClass={SECTION_ACCENTS.files}
              >
                <div className="grid gap-4">
                  <ResourceFormField
                    label="File URL"
                    htmlFor={`${idPrefix}-content-file`}
                    description="Set manually or upload a file below"
                  >
                    <Input
                      id={`${idPrefix}-content-file`}
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

                  <FileDropzone
                    title="Upload primary file"
                    description="PDF, DOCX, XLSX, or other downloadable file"
                    icon={<Upload className="h-8 w-8 text-indigo-500/70" />}
                    className="border-indigo-200/80 bg-indigo-50/30 hover:border-indigo-400/60 hover:bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35"
                    disabled={saving}
                    isUploading={isUploading}
                    onFileSelect={onContentFileUpload}
                  />
                </div>
              </ResourceFormSection>
              ) : null}

              {!isMenuAcademy ? attachmentsSection : null}
            </div>
          </TabsContent>
          ) : null}
        </Tabs>

        <DialogFooter className="relative z-10 shrink-0 border-t bg-muted/20 px-6 py-4 sm:justify-end">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
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
                  {labels.saveButton}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
