import { DashboardLayout } from '@/components/layout';
import { CategoryFilterSelect } from '@/components/CategoryFilterSelect';
import { ImageUpload } from '@/components/ImageUpload';
import { InlineSortOrderInput } from '@/components/InlineSortOrderInput';
import {
  formatProductCategoryCell,
  ProductCategoriesFields,
} from '@/components/ProductCategoriesFields';
import { MenuAdditionalImages } from '@/components/MenuAdditionalImages';
import { ProductShippingFields } from '@/components/ProductShippingFields';
import { SearchableMultiSelect } from '@/components/SearchableMultiSelect';
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
import { useBulkRowSelection } from '@/hooks/useBulkRowSelection';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import { previewFromImageUrls, type ImageUrlsMap } from '@/lib/image-urls';
import { resizeImageToSizes } from '@/lib/image-resize';
import {
  parseMenuImageUrls,
  previewFromParsedMenuImages,
  serializeMenuImageUrls,
  type MenuImageMoreEntry,
} from '@/lib/menu-image-urls';
import { slugFromName } from '@/lib/slug';
import { nextProductId } from '@/lib/products';
import {
  countProductsByCategoryId,
  flattenAdminCategoryFilterSections,
  loadAdminCategoryFilterSections,
  type AdminCategoryFilterSection,
} from '@/lib/category-filter-sections';
import {
  attachProductCategoryFields,
  loadProductCategoriesByProductIds,
  syncProductCategories,
} from '@/lib/product-categories';
import {
  emptyProductShippingInput,
  PRODUCT_SHIPPING_SELECT,
  productShippingFromRow,
  productShippingToPayload,
  validateProductShippingInput,
  type ProductShippingInput,
  type ProductShippingRow,
} from '@/lib/product-shipping';
import supabase from '@/lib/supabase/client';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  DollarSign,
  FilePenLine,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATERING_IMAGE_UPLOAD_RESIZES = [256, 512, 1024, 1920] as const;
const ADDITIONAL_IMAGE_SM = 256;
const ADDITIONAL_IMAGE_LG = 1920;

const TIER_ROW_ACCENTS = [
  'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20',
  'border-l-sky-500 bg-sky-50/50 dark:bg-sky-950/20',
  'border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20',
  'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
] as const;

function CateringPackFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  accentClass,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
  accentClass?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-4 shadow-xs md:col-span-2',
        accentClass ?? 'border-border/70 bg-muted/20',
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3 border-b border-border/40 pb-3">
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-xs ring-1 ring-border/50">
            <Icon className="size-4 text-foreground/70" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function CateringPackFormField({
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

type SortColumn = 'id' | 'category' | 'name' | 'sort_order';
type SortDirection = 'asc' | 'desc';

type CateringTierPrice = {
  size: string;
  price: string;
  serves: string;
};

type CustomizationOption = {
  id: number;
  kind: string;
  key: string;
  title: string;
};

function formatCustomizationLabel(row: CustomizationOption): string {
  return `#${row.id} — ${row.title} (${row.key})`;
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

type CateringPackRow = {
  id: number;
  name: string;
  serves: string;
  price: string;
  unit_price: string;
  description: string;
  includes: string[];
  tag: string;
  tag_bg: string;
  image_url: string | null;
  image_urls: Record<string, unknown>;
  categoryIds: number[];
  primaryCategoryId: number | null;
  note: string | null;
  prices: CateringTierPrice[];
  sort_order: number;
  is_available: boolean;
  is_published: boolean;
  customizationIds: number[];
  customizationsDisabled: boolean;
} & ProductShippingRow;

type CateringPackInput = {
  id: number;
  name: string;
  serves: string;
  price: string;
  unit_price: string;
  description: string;
  includesText: string;
  tag: string;
  tag_bg: string;
  categoryIds: number[];
  primaryCategoryId: number | null;
  note: string;
  image_sizes: ImageUrlsMap;
  additional_images: MenuImageMoreEntry[];
  prices: CateringTierPrice[];
  sort_order: number;
  is_available: boolean;
  is_published: boolean;
  customizationIds: number[];
  customizationsDisabled: boolean;
} & ProductShippingInput;

const emptyTierPrice = (): CateringTierPrice => ({
  size: '',
  price: '',
  serves: '',
});

const emptyCateringPackInput = (): CateringPackInput => ({
  id: 0,
  name: '',
  serves: '',
  price: '',
  unit_price: '',
  description: '',
  includesText: '',
  tag: '',
  tag_bg: '',
  categoryIds: [],
  primaryCategoryId: null,
  note: '',
  image_sizes: {},
  additional_images: [],
  prices: [],
  sort_order: 0,
  is_available: true,
  is_published: true,
  customizationIds: [],
  customizationsDisabled: false,
  ...emptyProductShippingInput(),
});

function parseTierPrices(value: unknown): CateringTierPrice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        size: String(row.size ?? '').trim(),
        price: String(row.price ?? '').trim(),
        serves: String(row.serves ?? '').trim(),
      };
    })
    .filter((item) => item.size || item.price || item.serves);
}

function serializeTierPrices(rows: CateringTierPrice[]): CateringTierPrice[] {
  return rows
    .map((row) => ({
      size: row.size.trim(),
      price: row.price.trim(),
      serves: row.serves.trim(),
    }))
    .filter((row) => row.size && row.price && row.serves);
}

function formatCateringPriceLabel(unitPrice: number): string {
  if (Number.isInteger(unitPrice)) {
    return `$${unitPrice}`;
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(unitPrice);
}

function resolveCateringPriceLabel(
  priceLabel: string,
  unitPriceRaw: string,
): string {
  const trimmedPriceLabel = priceLabel.trim();
  if (trimmedPriceLabel) return trimmedPriceLabel;

  const trimmedUnitPrice = unitPriceRaw.trim();
  if (!trimmedUnitPrice) return '';

  const value = Number(trimmedUnitPrice);
  if (!Number.isFinite(value)) return '';

  return formatCateringPriceLabel(value);
}

function cateringNeedsQuote(unitPriceRaw: string | null | undefined): boolean {
  const trimmed = unitPriceRaw?.trim() ?? '';
  if (!trimmed) return true;
  const value = Number(trimmed);
  return !Number.isFinite(value);
}

function mapCateringPackDbRow(
  row: Record<string, unknown> & {
    categoryIds: number[];
    primaryCategoryId: number | null;
  },
): CateringPackRow {
  const customizationIds = Array.isArray(row.customization_ids)
    ? row.customization_ids.map((id) => Number(id))
    : [];

  const shipping: ProductShippingRow = {
    is_shippable: Boolean(row.is_shippable),
    ship_weight_kg:
      row.ship_weight_kg != null ? Number(row.ship_weight_kg) : null,
    ship_length_cm:
      row.ship_length_cm != null ? Number(row.ship_length_cm) : null,
    ship_width_cm:
      row.ship_width_cm != null ? Number(row.ship_width_cm) : null,
    ship_height_cm:
      row.ship_height_cm != null ? Number(row.ship_height_cm) : null,
  };

  return {
    id: Number(row.id),
    name: String(row.name ?? ''),
    serves: String(row.serves ?? ''),
    price: String(row.price ?? ''),
    unit_price: String(row.unit_price ?? ''),
    description: String(row.description ?? ''),
    includes: Array.isArray(row.includes)
      ? row.includes.map((value) => String(value))
      : [],
    tag: String(row.tag ?? ''),
    tag_bg: String(row.tag_bg ?? ''),
    image_url:
      typeof row.image_url === 'string' ? row.image_url : null,
    image_urls:
      row.image_urls && typeof row.image_urls === 'object'
        ? (row.image_urls as Record<string, unknown>)
        : {},
    categoryIds: row.categoryIds,
    primaryCategoryId: row.primaryCategoryId,
    note: typeof row.note === 'string' ? row.note : null,
    prices: parseTierPrices(row.prices),
    sort_order: Number(row.sort_order ?? 0),
    is_available: Boolean(row.is_available),
    is_published: row.is_published !== false,
    customizationIds,
    customizationsDisabled: Boolean(row.customizations_disabled),
    ...shipping,
  };
}

async function nextCateringPackId(): Promise<number> {
  return nextProductId('catering');
}

export function CateringPacks() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia } = useSupabaseStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [packs, setPacks] = useState<CateringPackRow[]>([]);
  const [categoryFilterSections, setCategoryFilterSections] = useState<
    AdminCategoryFilterSection[]
  >([]);
  const [customizations, setCustomizations] = useState<CustomizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CateringPackInput>(emptyCateringPackInput());
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdditionalImages, setIsUploadingAdditionalImages] =
    useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CateringPackRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('sort_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [inlineSortSavingId, setInlineSortSavingId] = useState<number | null>(null);

  const loadCateringPacks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(
          `id, name, serves, price, unit_price, description, includes, tag, tag_bg, image_url, image_urls, note, prices, sort_order, is_available, is_published, customization_ids, customizations_disabled, ${PRODUCT_SHIPPING_SELECT}`,
        )
        .eq('product_type', 'catering')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as Array<
        Record<string, unknown> & { id: number; prices: unknown }
      >;
      const categoriesByProductId = await loadProductCategoriesByProductIds(
        rows.map((row) => row.id),
      );

      setPacks(
        attachProductCategoryFields(rows, categoriesByProductId).map(
          mapCateringPackDbRow,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load catering packs.';
      setError(message);
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomizations = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('product_customizations')
        .select('id, kind, key, title')
        .eq('kind', 'catering')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setCustomizations((data ?? []) as CustomizationOption[]);
    } catch {
      setCustomizations([]);
    }
  }, []);

  const loadCategoryOptions = useCallback(async () => {
    try {
      const sections = await loadAdminCategoryFilterSections('catering');
      setCategoryFilterSections(sections);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load catering categories.',
      );
      setCategoryFilterSections([]);
    }
  }, []);

  const categoryOptions = useMemo(
    () => flattenAdminCategoryFilterSections(categoryFilterSections),
    [categoryFilterSections],
  );

  const productCountByCategoryId = useMemo(
    () => countProductsByCategoryId(packs),
    [packs],
  );

  useEffect(() => {
    if (isAdmin) {
      void loadCateringPacks();
      void loadCustomizations();
      void loadCategoryOptions();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadCateringPacks, loadCustomizations, loadCategoryOptions]);

  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((category) => [category.id, category.name])),
    [categoryOptions],
  );

  const customizationSelectOptions = useMemo(
    () =>
      customizations.map((row) => ({
        value: String(row.id),
        label: formatCustomizationLabel(row),
      })),
    [customizations],
  );

  const filteredPacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = packs.filter((pack) => {
      if (categoryFilter !== 'all') {
        const filterId = Number(categoryFilter);
        if (!Number.isFinite(filterId) || !pack.categoryIds.includes(filterId)) {
          return false;
        }
      }
      if (!term) return true;
      const categoryNames = pack.categoryIds
        .map((categoryId) => categoryNameById.get(categoryId) ?? '')
        .join(' ');
      return (
        (pack.name ?? '').toLowerCase().includes(term) ||
        categoryNames.toLowerCase().includes(term) ||
        (pack.serves ?? '').toLowerCase().includes(term) ||
        (pack.price ?? '').toLowerCase().includes(term) ||
        (pack.description ?? '').toLowerCase().includes(term) ||
        (pack.tag ?? '').toLowerCase().includes(term) ||
        (pack.note ?? '').toLowerCase().includes(term) ||
        (pack.image_url ?? '').toLowerCase().includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') {
        return (a.id - b.id) * direction;
      }
      if (sortColumn === 'sort_order') {
        return (a.sort_order - b.sort_order || a.id - b.id) * direction;
      }
      if (sortColumn === 'category') {
        const categoryLabel = (pack: CateringPackRow) => {
          const categoryId = pack.primaryCategoryId ?? pack.categoryIds[0] ?? null;
          return categoryId != null
            ? categoryNameById.get(categoryId) ?? ''
            : '';
        };
        return categoryLabel(a).localeCompare(categoryLabel(b)) * direction;
      }
      return a.name.localeCompare(b.name) * direction;
    });
  }, [packs, search, categoryFilter, sortColumn, sortDirection, categoryNameById]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const {
    selectedIds,
    selectedCount,
    selectAllRef,
    allFilteredSelected,
    toggleSelected,
    toggleSelectAllFiltered,
    clearSelection,
    removeFromSelection,
  } = useBulkRowSelection(filteredPacks);

  const handleInlineSortOrderSave = useCallback(
    async (packId: number, sortOrder: number) => {
      setInlineSortSavingId(packId);
      try {
        const { error: updateError } = await supabase
          .from('products')
          .update({ sort_order: sortOrder })
          .eq('id', packId)
          .eq('product_type', 'catering');

        if (updateError) throw updateError;

        setPacks((prev) =>
          prev.map((pack) =>
            pack.id === packId ? { ...pack, sort_order: sortOrder } : pack,
          ),
        );
        toast.success('Sort order updated.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update sort order.',
        );
        throw err;
      } finally {
        setInlineSortSavingId(null);
      }
    },
    [],
  );

  const openCreate = async () => {
    try {
      const id = await nextCateringPackId();
      setEditingId(null);
      setForm({
        ...emptyCateringPackInput(),
        id,
        sort_order: packs.length,
      });
      setImagePreviewUrl(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not prepare new catering pack.',
      );
    }
  };

  const openEdit = (pack: CateringPackRow) => {
    const parsedImages = parseMenuImageUrls(pack.image_urls);
    const legacySizes =
      Object.keys(parsedImages.sizes).length === 0 && pack.image_url
        ? { '1920': pack.image_url }
        : parsedImages.sizes;

    setEditingId(pack.id);
    setForm({
      id: pack.id,
      name: pack.name,
      serves: pack.serves ?? '',
      price: pack.price ?? '',
      unit_price: pack.unit_price ?? '',
      description: pack.description ?? '',
      includesText: pack.includes.join('\n'),
      tag: pack.tag ?? '',
      tag_bg: pack.tag_bg ?? '',
      categoryIds: [...pack.categoryIds],
      primaryCategoryId: pack.primaryCategoryId,
      note: pack.note ?? '',
      image_sizes: legacySizes,
      additional_images: parsedImages.more,
      prices: pack.prices.length > 0 ? pack.prices : [],
      sort_order: pack.sort_order,
      is_available: pack.is_available,
      is_published: pack.is_published ?? true,
      customizationIds: [...pack.customizationIds],
      customizationsDisabled: pack.customizationsDisabled,
      ...productShippingFromRow(pack),
    });
    setImagePreviewUrl(
      previewFromParsedMenuImages(
        { sizes: legacySizes, more: parsedImages.more },
        [...CATERING_IMAGE_UPLOAD_RESIZES],
      ) ?? pack.image_url,
    );
    setDialogOpen(true);
  };

  const slugPart = () =>
    slugFromName(form.name) || `catering-${form.id || 'new'}`;

  const handleImageUpload = async (input: File | File[]) => {
    const files = Array.isArray(input) ? input : [input];
    const sizes = [...CATERING_IMAGE_UPLOAD_RESIZES].sort((a, b) => a - b);

    if (files.length !== sizes.length) {
      toast.error('Unexpected number of resized image files.');
      return;
    }

    const baseSlug = slugPart();
    const timestamp = Date.now();

    setIsUploadingImages(true);
    try {
      const imageUrls: ImageUrlsMap = {};

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${baseSlug}-${timestamp}_${size}.${ext}`;

        const { publicUrl } = await uploadMedia(file, {
          folder: 'catering-packs',
          fileName,
          upsert: true,
        });
        imageUrls[String(size)] = publicUrl;
      }

      setForm((prev) => ({ ...prev, image_sizes: imageUrls }));
      setImagePreviewUrl(previewFromImageUrls(imageUrls));
      toast.success('Catering images uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload catering images.';
      toast.error(message);
      throw err;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, image_sizes: {} }));
    setImagePreviewUrl(null);
  };

  const handleAdditionalImageUpload = async (file: File) => {
    const baseSlug = slugPart();
    const timestamp = Date.now();
    const index = form.additional_images.length;

    setIsUploadingAdditionalImages(true);
    try {
      const [smFile, lgFile] = await resizeImageToSizes(file, [
        ADDITIONAL_IMAGE_SM,
        ADDITIONAL_IMAGE_LG,
      ]);
      const ext = smFile.name.split('.').pop()?.toLowerCase() || 'jpg';

      const { publicUrl: sm } = await uploadMedia(smFile, {
        folder: 'catering-packs',
        fileName: `${baseSlug}-more-${index}-${timestamp}-sm.${ext}`,
        upsert: true,
      });
      const { publicUrl: lg } = await uploadMedia(lgFile, {
        folder: 'catering-packs',
        fileName: `${baseSlug}-more-${index}-${timestamp}-lg.${ext}`,
        upsert: true,
      });

      setForm((prev) => ({
        ...prev,
        additional_images: [...prev.additional_images, { sm, lg }],
      }));
      toast.success('Additional image added.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to upload additional image.';
      toast.error(message);
      throw err;
    } finally {
      setIsUploadingAdditionalImages(false);
    }
  };

  const handleAdditionalImageRemove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index),
    }));
  };

  const imageUploadBusy = isUploadingImages || isUploadingAdditionalImages;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const tierPrices = serializeTierPrices(form.prices);
    const includesValues = form.includesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const unitPrice = form.unit_price.trim();
    if (unitPrice && Number.isNaN(Number(unitPrice))) {
      toast.error('Unit price must be a valid number.');
      return;
    }

    const priceLabel = resolveCateringPriceLabel(form.price, unitPrice);

    if (tierPrices.length === 0) {
      if (!form.serves.trim()) {
        toast.error('Serves is required when no tier prices are set.');
        return;
      }
      if (!priceLabel) {
        toast.error(
          'Unit price or price label is required when no tier prices are set.',
        );
        return;
      }
      if (!form.description.trim()) {
        toast.error('Description is required when no tier prices are set.');
        return;
      }
      if (!form.tag.trim()) {
        toast.error('Tag is required when no tier prices are set.');
        return;
      }
      if (!form.tag_bg.trim()) {
        toast.error('Tag background class is required when no tier prices are set.');
        return;
      }
      if (includesValues.length === 0) {
        toast.error('At least one include line is required when no tier prices are set.');
        return;
      }
    }

    const shippingError = validateProductShippingInput(form);
    if (shippingError) {
      toast.error(shippingError);
      return;
    }

    const image_urls = serializeMenuImageUrls(
      form.image_sizes,
      form.additional_images,
    );
    const image_url =
      previewFromParsedMenuImages(
        { sizes: form.image_sizes, more: form.additional_images },
        [...CATERING_IMAGE_UPLOAD_RESIZES],
      ) ?? null;

    setSaving(true);
    try {
      const payload = {
        product_type: 'catering' as const,
        id: form.id,
        name: form.name.trim(),
        serves: form.serves.trim(),
        price: priceLabel,
        unit_price: unitPrice,
        description: form.description.trim(),
        includes: includesValues,
        tag: form.tag.trim(),
        tag_bg: form.tag_bg.trim(),
        image_url,
        image_urls,
        note: form.note.trim() || null,
        prices: tierPrices,
        sort_order: Number(form.sort_order) || 0,
        is_available: form.is_available,
        is_published: form.is_published,
        customization_ids: form.customizationIds,
        customizations_disabled: form.customizationsDisabled,
        ...productShippingToPayload(form),
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingId)
          .eq('product_type', 'catering');

        if (updateError) throw updateError;
        await syncProductCategories(
          form.id,
          form.categoryIds,
          form.primaryCategoryId,
          Number(form.sort_order) || 0,
        );
        toast.success('Catering item updated.');
      } else {
        const { error: insertError } = await supabase.from('products').insert(payload);

        if (insertError) throw insertError;
        await syncProductCategories(
          form.id,
          form.categoryIds,
          form.primaryCategoryId,
          Number(form.sort_order) || 0,
        );
        toast.success('Catering item created.');
      }

      setDialogOpen(false);
      await loadCateringPacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save catering item.',
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
        .from('products')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('product_type', 'catering');

      if (deleteError) throw deleteError;
      toast.success('Catering item deleted.');
      removeFromSelection(deleteTarget.id);
      setDeleteTarget(null);
      await loadCateringPacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete catering item.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', ids)
        .eq('product_type', 'catering');

      if (deleteError) throw deleteError;
      toast.success(
        `Deleted ${ids.length} catering ${ids.length === 1 ? 'item' : 'items'}.`,
      );
      clearSelection();
      setBulkDeleteOpen(false);
      await loadCateringPacks();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete catering items.',
      );
    } finally {
      setSaving(false);
    }
  };

  const updateTierPrice = (
    index: number,
    field: keyof CateringTierPrice,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addTierPrice = () => {
    setForm((prev) => ({
      ...prev,
      prices: [...prev.prices, emptyTierPrice()],
    }));
  };

  const removeTierPrice = (index: number) => {
    setForm((prev) => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== index),
    }));
  };

  if (profileLoading) {
    return (
      <DashboardLayout title="Catering Packs">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Catering Packs">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can manage catering items.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Catering Packs">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Catering items</CardTitle>
              <CardDescription>
                Manage catering packs and hot dishes shown on the public catering
                page.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadCateringPacks()}
                disabled={loading}
              />
              <Button onClick={() => void openCreate()} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-row flex-wrap items-center gap-3">
                <Input
                  placeholder="Search name, category, tag, note..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-[12rem] flex-1 max-w-sm"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="pack-category-filter" className="whitespace-nowrap">
                    Category
                  </Label>
                  <CategoryFilterSelect
                    id="pack-category-filter"
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                    sections={categoryFilterSections}
                    productCountByCategoryId={productCountByCategoryId}
                    totalProductCount={packs.length}
                  />
                </div>
              </div>
              {selectedCount > 0 ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="shrink-0 self-end sm:self-auto"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                  Delete {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
                </Button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No catering items found. Add one to get started.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-4 py-3">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={allFilteredSelected}
                          disabled={saving || filteredPacks.length === 0}
                          aria-label="Select all visible catering items"
                          onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                        />
                      </th>
                      <SortableHeader
                        label="ID"
                        column="id"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Category"
                        column="category"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Name"
                        column="name"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Serves
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Tiers
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Available
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Published
                      </th>
                      <SortableHeader
                        label="Sort"
                        column="sort_order"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-right text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPacks.map((pack) => (
                      <tr
                        key={pack.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${
                          selectedIds.has(pack.id) ? 'bg-muted/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(pack.id)}
                            disabled={saving}
                            aria-label={`Select catering item ${pack.name}`}
                            onChange={(e) => toggleSelected(pack.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{pack.id}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatProductCategoryCell(
                            pack.categoryIds,
                            pack.primaryCategoryId,
                            categoryNameById,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {pack.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.serves || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {pack.price ? (
                              <span>{pack.price}</span>
                            ) : cateringNeedsQuote(pack.unit_price) ? null : (
                              '—'
                            )}
                            {cateringNeedsQuote(pack.unit_price) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex text-amber-600"
                                    aria-label="Quoting will be required"
                                  >
                                    <FilePenLine className="h-4 w-4" aria-hidden />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Quoting will be required
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {pack.prices.length > 0 ? pack.prices.length : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={pack.is_available ? 'default' : 'secondary'}
                          >
                            {pack.is_available ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={pack.is_published ? 'default' : 'secondary'}
                          >
                            {pack.is_published ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <InlineSortOrderInput
                            value={pack.sort_order}
                            disabled={inlineSortSavingId === pack.id || saving}
                            onCommit={(sortOrder) =>
                              handleInlineSortOrderSave(pack.id, sortOrder)
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(pack)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTarget(pack)}
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
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <div className="shrink-0 border-b bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 px-6 py-5">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-amber-300/70 bg-background/70 text-amber-900 dark:text-amber-200"
                >
                  <Package className="size-3.5" aria-hidden />
                  Catering
                </Badge>
                {form.is_available ? (
                  <Badge className="border-emerald-200 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="secondary">Hidden</Badge>
                )}
                {form.tag.trim() ? (
                  <Badge className={cn('border-transparent', form.tag_bg || 'bg-muted')}>
                    {form.tag}
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="text-xl">
                {editingId !== null ? 'Edit catering item' : 'Add catering item'}
              </DialogTitle>
              {form.name.trim() ? (
                <p className="text-sm font-medium text-foreground/80">{form.name}</p>
              ) : null}
              <DialogDescription>
                Use tier prices for hot dishes. Use single price, tag, and includes
                for standard catering packs.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
            <CateringPackFormSection
              title="Images"
              description="Primary hero image and optional gallery shots for the catering page."
              icon={ImageIcon}
              accentClass="border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-background dark:border-sky-900/50 dark:from-sky-950/30"
            >
              <div className="space-y-4">
                <ImageUpload
                  label="Primary image"
                  description="JPEG, PNG, WebP or GIF. Uploads 256, 512, 1024 and 1920px variants."
                  value={
                    imagePreviewUrl ??
                    previewFromImageUrls(form.image_sizes) ??
                    null
                  }
                  onFileSelect={handleImageUpload}
                  onClear={
                    Object.keys(form.image_sizes).length > 0
                      ? handleImageClear
                      : undefined
                  }
                  uploadResizes={[...CATERING_IMAGE_UPLOAD_RESIZES]}
                  isUploading={isUploadingImages}
                  disabled={saving || imageUploadBusy}
                  shape="square"
                />
                <MenuAdditionalImages
                  images={form.additional_images}
                  onAdd={handleAdditionalImageUpload}
                  onRemove={handleAdditionalImageRemove}
                  isUploading={isUploadingAdditionalImages}
                  disabled={saving || imageUploadBusy}
                />
              </div>
            </CateringPackFormSection>

            <CateringPackFormSection
              title="Item details"
              description="Core identity, category, and display order on the catering page."
              icon={Package}
              accentClass="border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-background dark:border-violet-900/50 dark:from-violet-950/30"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <CateringPackFormField label="ID" htmlFor="pack-id">
                  <Input
                    id="pack-id"
                    type="number"
                    value={form.id}
                    disabled={editingId !== null}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id: Number(e.target.value) || 0 }))
                    }
                  />
                </CateringPackFormField>
                <CateringPackFormField label="Sort order" htmlFor="pack-sort">
                  <Input
                    id="pack-sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sort_order: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </CateringPackFormField>
                <CateringPackFormField
                  label="Categories"
                  htmlFor="pack-categories"
                  className="md:col-span-2"
                >
                  <ProductCategoriesFields
                    idPrefix="pack"
                    value={{
                      categoryIds: form.categoryIds,
                      primaryCategoryId: form.primaryCategoryId,
                    }}
                    sections={categoryFilterSections}
                    disabled={saving || imageUploadBusy}
                    onChange={({ categoryIds, primaryCategoryId }) =>
                      setForm((f) => ({
                        ...f,
                        categoryIds,
                        primaryCategoryId,
                      }))
                    }
                  />
                </CateringPackFormField>
                <CateringPackFormField
                  label="Name"
                  htmlFor="pack-name"
                  className="md:col-span-2"
                >
                  <Input
                    id="pack-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </CateringPackFormField>
              </div>
            </CateringPackFormSection>

            <CateringPackFormSection
              title="Pricing"
              description="Single price for packs, or tier rows for hot dishes and platters."
              icon={DollarSign}
              accentClass="border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-background dark:border-emerald-900/50 dark:from-emerald-950/30"
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <CateringPackFormField label="Serves" htmlFor="pack-serves">
                    <Input
                      id="pack-serves"
                      value={form.serves}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, serves: e.target.value }))
                      }
                    />
                  </CateringPackFormField>
                  <CateringPackFormField label="Price label" htmlFor="pack-price">
                    <Input
                      id="pack-price"
                      value={form.price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price: e.target.value }))
                      }
                      placeholder="$160"
                    />
                  </CateringPackFormField>
                  <CateringPackFormField label="Unit price" htmlFor="pack-unit-price">
                    <Input
                      id="pack-unit-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.unit_price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unit_price: e.target.value }))
                      }
                      placeholder="160.00"
                    />
                  </CateringPackFormField>
                </div>

                <div className="space-y-3 rounded-lg border border-emerald-200/60 bg-background/60 p-3 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Tier prices</p>
                      <p className="text-xs text-muted-foreground">
                        Optional size/price/serves rows for hot dishes and platters.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-emerald-300/70 bg-background/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      onClick={addTierPrice}
                      disabled={saving}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add tier
                    </Button>
                  </div>

                  {form.prices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tier prices. Add tiers or use single price above.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.prices.map((tier, index) => (
                        <div
                          key={`tier-${index}`}
                          className={cn(
                            'grid gap-3 rounded-lg border border-l-4 p-3 md:grid-cols-[1fr_1fr_1fr_auto]',
                            TIER_ROW_ACCENTS[index % TIER_ROW_ACCENTS.length],
                          )}
                        >
                          <CateringPackFormField
                            label="Size"
                            htmlFor={`tier-size-${index}`}
                          >
                            <Input
                              id={`tier-size-${index}`}
                              value={tier.size}
                              onChange={(e) =>
                                updateTierPrice(index, 'size', e.target.value)
                              }
                              placeholder="Small"
                            />
                          </CateringPackFormField>
                          <CateringPackFormField
                            label="Price"
                            htmlFor={`tier-price-${index}`}
                          >
                            <Input
                              id={`tier-price-${index}`}
                              value={tier.price}
                              onChange={(e) =>
                                updateTierPrice(index, 'price', e.target.value)
                              }
                              placeholder="$65"
                            />
                          </CateringPackFormField>
                          <CateringPackFormField
                            label="Serves"
                            htmlFor={`tier-serves-${index}`}
                          >
                            <Input
                              id={`tier-serves-${index}`}
                              value={tier.serves}
                              onChange={(e) =>
                                updateTierPrice(index, 'serves', e.target.value)
                              }
                              placeholder="5–7 People"
                            />
                          </CateringPackFormField>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTierPrice(index)}
                              disabled={saving}
                              aria-label={`Remove tier ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CateringPackFormSection>

            <CateringPackFormSection
              title="Presentation"
              description="Tags, copy, and bullet points shown on the public catering card."
              icon={Sparkles}
              accentClass="border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-background dark:border-amber-900/50 dark:from-amber-950/30"
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <CateringPackFormField label="Tag" htmlFor="pack-tag">
                    <Input
                      id="pack-tag"
                      value={form.tag}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tag: e.target.value }))
                      }
                    />
                  </CateringPackFormField>
                  <CateringPackFormField
                    label="Tag background class"
                    htmlFor="pack-tag-bg"
                    description="Tailwind classes for the tag badge preview."
                  >
                    <Input
                      id="pack-tag-bg"
                      value={form.tag_bg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tag_bg: e.target.value }))
                      }
                    />
                  </CateringPackFormField>
                </div>
                {form.tag.trim() ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300/60 bg-background/70 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Preview</span>
                    <Badge className={cn('border-transparent', form.tag_bg || 'bg-muted')}>
                      {form.tag}
                    </Badge>
                  </div>
                ) : null}
                <CateringPackFormField label="Description" htmlFor="pack-description">
                  <Textarea
                    id="pack-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </CateringPackFormField>
                <CateringPackFormField
                  label="Note"
                  htmlFor="pack-note"
                  description="Optional note shown on hot dishes."
                >
                  <Textarea
                    id="pack-note"
                    rows={2}
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="Optional note shown on hot dishes"
                  />
                </CateringPackFormField>
                <CateringPackFormField
                  label="Includes"
                  htmlFor="pack-includes"
                  description="One item per line."
                >
                  <Textarea
                    id="pack-includes"
                    rows={5}
                    value={form.includesText}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, includesText: e.target.value }))
                    }
                  />
                </CateringPackFormField>
              </div>
            </CateringPackFormSection>

            <CateringPackFormSection
              title="Customizations"
              description="Override category defaults for this item. Leave empty to inherit from the catering category."
              icon={SlidersHorizontal}
              accentClass="border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-background dark:border-emerald-900/50 dark:from-emerald-950/30"
            >
              <div className="space-y-4">
                <CateringPackFormField
                  label="Customization groups"
                  htmlFor="pack-customizations"
                  description="Ordered groups shown when customers configure this item. Selection order is preserved."
                >
                  <SearchableMultiSelect
                    id="pack-customizations"
                    options={customizationSelectOptions}
                    values={form.customizationIds.map(String)}
                    onValuesChange={(values) =>
                      setForm((f) => ({
                        ...f,
                        customizationIds: values.map((value) => Number(value)),
                      }))
                    }
                    disabled={saving || imageUploadBusy || form.customizationsDisabled}
                    placeholder="Search catering customization groups…"
                  />
                </CateringPackFormField>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.customizationsDisabled}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      customizationsDisabled: !f.customizationsDisabled,
                    }))
                  }
                  disabled={saving || imageUploadBusy}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-all',
                    form.customizationsDisabled
                      ? 'border-amber-300/70 bg-amber-500/10 font-medium text-amber-950 dark:text-amber-100'
                      : 'border-border/60 bg-background hover:border-emerald-300/50 hover:bg-emerald-50/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                      form.customizationsDisabled
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-muted-foreground/40 bg-background',
                    )}
                  >
                    {form.customizationsDisabled ? (
                      <Check className="size-3 stroke-[3]" aria-hidden />
                    ) : null}
                  </span>
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium leading-none">
                      Disable customizations
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {form.customizationsDisabled
                        ? 'No customization options are shown for this item, even if category or product overrides are set.'
                        : 'When enabled, category defaults or product overrides above apply on the storefront.'}
                    </span>
                  </div>
                </button>
              </div>
            </CateringPackFormSection>

            <CateringPackFormSection
              title="Shipping / freight"
              description="Per sellable unit dimensions used for courier freight quotes."
              icon={Truck}
              accentClass="border-teal-200/70 bg-gradient-to-br from-teal-50/80 to-background dark:border-teal-900/50 dark:from-teal-950/30"
            >
              <div className="[&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none [&_h4]:sr-only [&_p]:sr-only">
                <ProductShippingFields
                  idPrefix="pack"
                  value={form}
                  onChange={(shipping) => setForm((f) => ({ ...f, ...shipping }))}
                  disabled={saving || imageUploadBusy}
                />
              </div>
            </CateringPackFormSection>

            <CateringPackFormSection
              title="Availability"
              description="Control whether this item appears on the public catering page."
              accentClass="border-rose-200/70 bg-gradient-to-br from-rose-50/80 to-background dark:border-rose-900/50 dark:from-rose-950/30"
            >
              <div className="grid gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.is_published}
                  onClick={() =>
                    setForm((f) => ({ ...f, is_published: !f.is_published }))
                  }
                  disabled={saving || imageUploadBusy}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-all',
                    form.is_published
                      ? 'border-sky-300/70 bg-sky-500/10 font-medium text-sky-950 dark:text-sky-100'
                      : 'border-border/60 bg-background hover:border-sky-300/50 hover:bg-sky-50/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                      form.is_published
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-muted-foreground/40 bg-background',
                    )}
                  >
                    {form.is_published ? (
                      <Check className="size-3 stroke-[3]" aria-hidden />
                    ) : null}
                  </span>
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium leading-none">
                      Published on storefront
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {form.is_published
                        ? 'Visible on the public catering catalogue when also marked available.'
                        : 'Draft — hidden from the public site regardless of availability.'}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.is_available}
                  onClick={() =>
                    setForm((f) => ({ ...f, is_available: !f.is_available }))
                  }
                  disabled={saving || imageUploadBusy}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-all',
                    form.is_available
                      ? 'border-emerald-300/70 bg-emerald-500/10 font-medium text-emerald-950 dark:text-emerald-100'
                      : 'border-border/60 bg-background hover:border-rose-300/50 hover:bg-rose-50/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                      form.is_available
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-muted-foreground/40 bg-background',
                    )}
                  >
                    {form.is_available ? (
                      <Check className="size-3 stroke-[3]" aria-hidden />
                    ) : null}
                  </span>
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium leading-none">
                      Available on catering page
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {form.is_available
                        ? 'Customers can view and enquire about this item.'
                        : 'Hidden from the public catering menu until enabled.'}
                    </span>
                  </div>
                </button>
              </div>
            </CateringPackFormSection>
          </div>

          <DialogFooter className="shrink-0 border-t bg-muted/20 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
              onClick={() => void handleSave()}
              disabled={saving}
            >
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
            <AlertDialogTitle>Delete catering item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong>.
              This cannot be undone.
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

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} catering {selectedCount === 1 ? 'item' : 'items'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedCount} catering{' '}
              {selectedCount === 1 ? 'item' : 'items'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
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
