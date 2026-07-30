import { BulkAddToCategoryDialog } from '@/components/BulkAddToCategoryDialog';
import {
  BulkProcessingOverlay,
  withBulkProcessing,
} from '@/components/BulkProcessingOverlay';
import { CategoryFilterSelect } from '@/components/CategoryFilterSelect';
import { ProductCategoryGroupFilterStrip } from '@/components/ProductCategoryGroupFilterStrip';
import { PublishedFilterSelect, matchesPublishedFilter, type PublishedFilterValue } from '@/components/PublishedFilterSelect';
import { DashboardLayout } from '@/components/layout';
import { ImageUpload } from '@/components/ImageUpload';
import { InlineSortOrderInput } from '@/components/InlineSortOrderInput';
import {
  formatProductCategoryCell,
  ProductCategoriesFields,
} from '@/components/ProductCategoriesFields';
import { MenuAdditionalImages } from '@/components/MenuAdditionalImages';
import { MenuFoodContentEditor } from '@/components/MenuFoodContentEditor';
import { MenuIngredientsEditor } from '@/components/MenuIngredientsEditor';
import { ProductShippingFields } from '@/components/ProductShippingFields';
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
import { Pagination } from '@/components/ui/pagination';
import { RefreshTableButton } from '@/components/ui/refresh-table-button';
import { useBulkRowSelection } from '@/hooks/useBulkRowSelection';
import { useProductCategoryGroupFilter } from '@/hooks/useProductCategoryGroupFilter';
import { useTablePagination } from '@/hooks/useTablePagination';
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
import { previewFromImageUrls, type ImageUrlsMap } from '@/lib/image-urls';
import { resizeImageToSizes } from '@/lib/image-resize';
import {
  parseMenuImageUrls,
  previewFromParsedMenuImages,
  serializeMenuImageUrls,
  type MenuImageMoreEntry,
} from '@/lib/menu-image-urls';
import { resolveMenuSlug, slugFromName } from '@/lib/slug';
import {
  flattenAdminCategoryFilterSections,
  loadAdminCategoryFilterSections,
  type AdminCategoryFilterSection,
} from '@/lib/category-filter-sections';
import {
  appendProductCategories,
  attachProductCategoryFields,
  loadProductCategoriesByProductIds,
  resolvePrimaryCategoryId,
  syncProductCategories,
} from '@/lib/product-categories';
import {
  nextProductId,
  PRODUCT_TABLE_PER_PAGE_OPTIONS,
} from '@/lib/products';
import {
  emptyProductShippingInput,
  PRODUCT_SHIPPING_SELECT,
  productShippingFromRow,
  productShippingToPayload,
  validateProductShippingInput,
  type ProductShippingInput,
  type ProductShippingRow,
} from '@/lib/product-shipping';
import { useStorage } from '@/hooks/useStorage';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FolderPlus,
  Globe,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  emptyFoodContent,
  isFoodContentEmpty,
  parseFoodContent,
  serializeFoodContent,
  type FoodContent,
} from '@/types/FoodContent';
import {
  emptyMenuItemIngredient,
  isMenuItemIngredientEmpty,
  parseMenuItemIngredient,
  serializeMenuItemIngredient,
  type MenuItemIngredient,
} from '@/types/MenuItem';

const MENU_IMAGE_UPLOAD_RESIZES = [256, 512, 1024, 1920] as const;
const ADDITIONAL_IMAGE_SM = 256;
const ADDITIONAL_IMAGE_LG = 1920;

type SortColumn = 'id' | 'name' | 'price' | 'sort_order';
type SortDirection = 'asc' | 'desc';

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

type MenuItemRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  wholesale_price: string | null;
  categoryIds: number[];
  primaryCategoryId: number | null;
  image_urls: Record<string, unknown>;
  related_items: number[];
  is_available: boolean;
  is_published: boolean;
  is_popular: boolean;
  sort_order: number;
  ingredients: unknown;
  energy: number;
  food_content: unknown;
  spicy_level: number;
} & ProductShippingRow;

type MenuItemInput = Omit<
  MenuItemRow,
  | 'ingredients'
  | 'image_urls'
  | 'food_content'
  | keyof ProductShippingRow
> & {
  image_sizes: ImageUrlsMap;
  additional_images: MenuImageMoreEntry[];
  ingredients: MenuItemIngredient;
  food_content: FoodContent;
} & ProductShippingInput;

const emptyMenuItemInput = (): MenuItemInput => ({
  id: 0,
  slug: '',
  name: '',
  description: '',
  price: '',
  wholesale_price: '',
  categoryIds: [],
  primaryCategoryId: null,
  image_sizes: {},
  additional_images: [],
  related_items: [],
  is_available: true,
  is_published: true,
  is_popular: false,
  sort_order: 0,
  ingredients: emptyMenuItemIngredient(),
  energy: 0,
  food_content: emptyFoodContent(),
  spicy_level: 0,
  ...emptyProductShippingInput(),
});

const SPICY_LEVEL_OPTIONS = [
  { value: '0', label: 'None (0)' },
  { value: '1', label: 'Mild (1)' },
  { value: '2', label: 'Medium (2)' },
  { value: '3', label: 'Hot (3)' },
  { value: '4', label: 'Extra hot (4)' },
  { value: '5', label: 'Very hot (5)' },
] as const;

async function nextMenuId(): Promise<number> {
  return nextProductId('alacarte');
}

export function Menu() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { uploadMedia } = useStorage();
  const isAdmin = profile?.user_role === 'admin';

  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categoryFilterSections, setCategoryFilterSections] = useState<
    AdminCategoryFilterSection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MenuItemInput>(emptyMenuItemInput());
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateIdDraft, setDuplicateIdDraft] = useState<string>('');
  const [duplicateLatestId, setDuplicateLatestId] = useState<number | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdditionalImages, setIsUploadingAdditionalImages] =
    useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItemRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);
  const [bulkAddCategoryOpen, setBulkAddCategoryOpen] = useState(false);
  const [bulkProcessingMessage, setBulkProcessingMessage] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<PublishedFilterValue>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('sort_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [inlineSortSavingId, setInlineSortSavingId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(
          `id, name, slug, description, price, wholesale_price, image_urls, is_available, is_published, is_popular, sort_order, ingredients, energy, food_content, spicy_level, category_id, related_items, ${PRODUCT_SHIPPING_SELECT}`,
        )
        .eq('product_type', 'alacarte')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as Omit<
        MenuItemRow,
        'categoryIds' | 'primaryCategoryId'
      >[];
      const categoriesByProductId = await loadProductCategoriesByProductIds(
        rows.map((row) => row.id),
      );

      setItems(
        attachProductCategoryFields(rows, categoriesByProductId).map((item) => ({
          ...item,
          slug: resolveMenuSlug(item.slug, item.name),
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load menu items.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategoryOptions = useCallback(async () => {
    try {
      const sections = await loadAdminCategoryFilterSections('menu');
      setCategoryFilterSections(sections);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load menu categories.',
      );
      setCategoryFilterSections([]);
    }
  }, []);

  const categoryOptions = useMemo(
    () => flattenAdminCategoryFilterSections(categoryFilterSections),
    [categoryFilterSections],
  );

  const {
    categoryGroupFilter,
    onCategoryGroupFilterChange,
    productCountByCategoryId,
    productCountByGroupId,
    scopedCategoryFilterSections,
    scopedCategoryIds,
    scopedTotalProductCount,
  } = useProductCategoryGroupFilter(items, categoryFilterSections);

  useEffect(() => {
    if (isAdmin) {
      void loadItems();
      void loadCategoryOptions();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadItems, loadCategoryOptions]);

  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((category) => [category.id, category.name])),
    [categoryOptions],
  );

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (
        scopedCategoryIds !== null &&
        !item.categoryIds.some((categoryId) => scopedCategoryIds.has(categoryId))
      ) {
        return false;
      }
      if (categoryFilter !== 'all') {
        const filterId = Number(categoryFilter);
        if (!Number.isFinite(filterId) || !item.categoryIds.includes(filterId)) {
          return false;
        }
      }
      if (!matchesPublishedFilter(item.is_published ?? false, publishedFilter)) {
        return false;
      }
      if (!term) return true;
      const categoryNames = item.categoryIds
        .map((categoryId) => categoryNameById.get(categoryId) ?? '')
        .join(' ');
      return (
        (item.name ?? '').toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term) ||
        categoryNames.toLowerCase().includes(term)
      );
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortColumn === 'id') {
        return (a.id - b.id) * direction;
      }
      if (sortColumn === 'sort_order') {
        return (a.sort_order - b.sort_order) * direction;
      }
      if (sortColumn === 'price') {
        return (Number(a.price) - Number(b.price)) * direction;
      }
      return (a.name ?? '').localeCompare(b.name ?? '') * direction;
    });
  }, [
    items,
    search,
    categoryFilter,
    categoryGroupFilter,
    publishedFilter,
    sortColumn,
    sortDirection,
    categoryNameById,
    scopedCategoryIds,
  ]);

  const paginationFilterKey = useMemo(
    () => `${search}|${categoryGroupFilter}|${categoryFilter}|${publishedFilter}`,
    [search, categoryGroupFilter, categoryFilter, publishedFilter],
  );

  const {
    paginatedItems: paginatedFilteredItems,
    page,
    perPage,
    totalPages,
    totalRecords,
    perPageOptions,
    setPage,
    onPerPageChange,
  } = useTablePagination(filteredItems, paginationFilterKey, {
    defaultPerPage: 20,
    perPageOptions: [...PRODUCT_TABLE_PER_PAGE_OPTIONS],
  });

  const {
    selectedIds,
    selectedCount,
    selectAllRef,
    allFilteredSelected,
    onRowCheckboxPointerDown,
    onRowCheckboxChange,
    toggleSelectAllFiltered,
    clearSelection,
    removeFromSelection,
  } = useBulkRowSelection(filteredItems, {
    displayRows: paginatedFilteredItems,
  });

  const handleInlineSortOrderSave = useCallback(
    async (itemId: number, sortOrder: number) => {
      setInlineSortSavingId(itemId);
      try {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            sort_order: sortOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
          .eq('product_type', 'alacarte');

        if (updateError) throw updateError;

        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, sort_order: sortOrder } : item,
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
      const id = await nextMenuId();
      setEditingId(null);
      setForm({
        ...emptyMenuItemInput(),
        id,
      });
      setImagePreviewUrl(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not prepare new menu item.',
      );
    }
  };

  const openEdit = (item: MenuItemRow) => {
    const parsedImages = parseMenuImageUrls(item.image_urls);
    setEditingId(item.id);
    setForm({
      id: item.id,
      name: item.name,
      slug: resolveMenuSlug(item.slug, item.name),
      description: item.description ?? '',
      price: item.price,
      wholesale_price: item.wholesale_price ?? '',
      categoryIds: [...item.categoryIds],
      primaryCategoryId: item.primaryCategoryId,
      image_sizes: parsedImages.sizes,
      additional_images: parsedImages.more,
      related_items: item.related_items,
      is_available: item.is_available,
      is_published: item.is_published ?? true,
      is_popular: item.is_popular,
      sort_order: item.sort_order,
      ingredients: parseMenuItemIngredient(item.ingredients),
      energy: item.energy ?? 0,
      food_content: parseFoodContent(item.food_content),
      spicy_level: Math.min(5, Math.max(0, item.spicy_level ?? 0)),
      ...productShippingFromRow(item),
    });
    setImagePreviewUrl(
      previewFromParsedMenuImages(parsedImages, [256, 512, 1024, 1920]),
    );
    setDialogOpen(true);
  };

  const handleImageUpload = async (input: File | File[]) => {
    const files = Array.isArray(input) ? input : [input];
    const sizes = [...MENU_IMAGE_UPLOAD_RESIZES].sort((a, b) => a - b);

    if (files.length !== sizes.length) {
      toast.error('Unexpected number of resized image files.');
      return;
    }

    const slugPart = form.slug.trim() || `menu-${form.id}`;
    const timestamp = Date.now();

    setIsUploadingImages(true);
    try {
      const imageUrls: ImageUrlsMap = {};

      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${slugPart}-${timestamp}_${size}.${ext}`;

        const { publicUrl } = await uploadMedia(file, {
          folder: 'menu',
          fileName,
          upsert: true,
        });
        imageUrls[String(size)] = publicUrl;
      }

      setForm((prev) => ({ ...prev, image_sizes: imageUrls }));
      setImagePreviewUrl(previewFromImageUrls(imageUrls));
      toast.success('Menu images uploaded.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload menu images.';
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
    const slugPart = form.slug.trim() || `menu-${form.id}`;
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
        folder: 'menu',
        fileName: `${slugPart}-more-${index}-${timestamp}-sm.${ext}`,
        upsert: true,
      });
      const { publicUrl: lg } = await uploadMedia(lgFile, {
        folder: 'menu',
        fileName: `${slugPart}-more-${index}-${timestamp}-lg.${ext}`,
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
    if (!form.price || isNaN(Number(form.price))) {
      toast.error('Price must be a valid number.');
      return;
    }

    const shippingError = validateProductShippingInput(form);
    if (shippingError) {
      toast.error(shippingError);
      return;
    }

    const ingredientsValue = isMenuItemIngredientEmpty(form.ingredients)
      ? {}
      : serializeMenuItemIngredient(form.ingredients);

    const foodContentValue = isFoodContentEmpty(form.food_content)
      ? {}
      : serializeFoodContent(form.food_content);

    const energyValue = Number.isFinite(form.energy)
      ? Math.max(0, Math.round(form.energy))
      : 0;

    const spicyLevelValue = Number.isFinite(form.spicy_level)
      ? Math.min(5, Math.max(0, Math.round(form.spicy_level)))
      : 0;

    setSaving(true);
    try {
      const slug = slugFromName(form.name);
      if (!slug) {
        toast.error('Name must produce a valid slug.');
        return;
      }

      const productId = editingId ?? form.id;
      const categoryIds = form.categoryIds;
      const primaryCategoryId = form.primaryCategoryId;
      const resolvedCategoryId = resolvePrimaryCategoryId(
        categoryIds,
        primaryCategoryId,
      );

      const payload = {
        product_type: 'alacarte' as const,
        id: form.id,
        name: form.name.trim(),
        slug,
        description: form.description?.trim() || '',
        price: String(form.price),
        wholesale_price: form.wholesale_price?.trim() || null,
        category_id: resolvedCategoryId,
        image_urls: serializeMenuImageUrls(
          form.image_sizes,
          form.additional_images,
        ),
        is_available: form.is_available,
        is_published: form.is_published,
        is_popular: form.is_popular,
        sort_order: Number(form.sort_order) || 0,
        ingredients: ingredientsValue,
        energy: energyValue,
        food_content: foodContentValue,
        spicy_level: spicyLevelValue,
        ...productShippingToPayload(form),
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: payload.name,
            slug: payload.slug,
            description: payload.description,
            price: payload.price,
            wholesale_price: payload.wholesale_price,
            category_id: payload.category_id,
            image_urls: payload.image_urls,
            is_available: payload.is_available,
            is_published: payload.is_published,
            is_popular: payload.is_popular,
            sort_order: payload.sort_order,
            ingredients: payload.ingredients,
            energy: payload.energy,
            food_content: payload.food_content,
            spicy_level: payload.spicy_level,
            is_shippable: payload.is_shippable,
            ship_weight_kg: payload.ship_weight_kg,
            ship_length_cm: payload.ship_length_cm,
            ship_width_cm: payload.ship_width_cm,
            ship_height_cm: payload.ship_height_cm,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .eq('product_type', 'alacarte');

        if (updateError) throw updateError;
        await syncProductCategories(
          productId,
          categoryIds,
          primaryCategoryId,
          Number(form.sort_order) || 0,
        );
        toast.success('Menu item updated.');
      } else {
        const { error: insertError } = await supabase.from('products').insert(payload);

        if (insertError) throw insertError;
        await syncProductCategories(
          productId,
          categoryIds,
          primaryCategoryId,
          Number(form.sort_order) || 0,
        );
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

  const openDuplicateDialog = async () => {
    if (editingId === null) return;
    try {
      const suggestedId = await nextMenuId();
      setDuplicateLatestId(Math.max(0, suggestedId - 1));
      setDuplicateIdDraft(String(suggestedId));
      setDuplicateDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch latest menu ID.',
      );
    }
  };

  const handleDuplicateConfirm = async () => {
    if (editingId === null) return;
    const nextId = Number.parseInt(duplicateIdDraft, 10);
    if (!Number.isInteger(nextId) || nextId <= 0) {
      toast.error('Duplicate ID must be a positive integer.');
      return;
    }

    const shippingError = validateProductShippingInput(form);
    if (shippingError) {
      toast.error(shippingError);
      return;
    }

    const ingredientsValue = isMenuItemIngredientEmpty(form.ingredients)
      ? {}
      : serializeMenuItemIngredient(form.ingredients);
    const foodContentValue = isFoodContentEmpty(form.food_content)
      ? {}
      : serializeFoodContent(form.food_content);
    const energyValue = Number.isFinite(form.energy)
      ? Math.max(0, Math.round(form.energy))
      : 0;
    const spicyLevelValue = Number.isFinite(form.spicy_level)
      ? Math.min(5, Math.max(0, Math.round(form.spicy_level)))
      : 0;
    const slug = slugFromName(form.name);
    if (!slug) {
      toast.error('Name must produce a valid slug.');
      return;
    }

    setSaving(true);
    try {
      const { data: existing, error: existingError } = await supabase
        .from('products')
        .select('id')
        .eq('id', nextId)
        .eq('product_type', 'alacarte')
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        toast.error(`ID ${nextId} is already taken.`);
        return;
      }

      const payload = {
        product_type: 'alacarte' as const,
        id: nextId,
        name: form.name.trim(),
        slug,
        description: form.description?.trim() || '',
        price: String(form.price),
        wholesale_price: form.wholesale_price?.trim() || null,
        image_urls: serializeMenuImageUrls(form.image_sizes, form.additional_images),
        is_available: form.is_available,
        is_published: form.is_published,
        is_popular: form.is_popular,
        sort_order: Number(form.sort_order) || 0,
        ingredients: ingredientsValue,
        energy: energyValue,
        food_content: foodContentValue,
        spicy_level: spicyLevelValue,
        ...productShippingToPayload(form),
      };

      const { error: insertError } = await supabase.from('products').insert(payload);
      if (insertError) throw insertError;
      await syncProductCategories(
        nextId,
        form.categoryIds,
        form.primaryCategoryId,
        Number(form.sort_order) || 0,
      );

      setDuplicateDialogOpen(false);
      toast.success(`Duplicated menu item as ID ${nextId}.`);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to duplicate menu item.',
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
        .eq('product_type', 'alacarte');

      if (deleteError) throw deleteError;
      toast.success('Menu item deleted.');
      removeFromSelection(deleteTarget.id);
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

  const handleBulkPublish = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setBulkPublishOpen(false);
    await withBulkProcessing(
      setBulkProcessingMessage,
      setSaving,
      `Publishing ${ids.length} menu ${ids.length === 1 ? 'item' : 'items'}…`,
      async () => {
        const { error: updateError } = await supabase
          .from('products')
          .update({ is_published: true })
          .in('id', ids)
          .eq('product_type', 'alacarte');

        if (updateError) throw updateError;
        toast.success(
          `Published ${ids.length} menu ${ids.length === 1 ? 'item' : 'items'}.`,
        );
        clearSelection();
        await loadItems();
      },
    ).catch((err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to publish menu items.',
      );
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setBulkDeleteOpen(false);
    await withBulkProcessing(
      setBulkProcessingMessage,
      setSaving,
      `Deleting ${ids.length} menu ${ids.length === 1 ? 'item' : 'items'}…`,
      async () => {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .in('id', ids)
          .eq('product_type', 'alacarte');

        if (deleteError) throw deleteError;
        toast.success(
          `Deleted ${ids.length} menu ${ids.length === 1 ? 'item' : 'items'}.`,
        );
        clearSelection();
        await loadItems();
      },
    ).catch((err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete menu items.',
      );
    });
  };

  const handleBulkAddToCategory = async (categoryIds: number[]) => {
    const ids = [...selectedIds];
    if (ids.length === 0 || categoryIds.length === 0) return;

    setBulkAddCategoryOpen(false);
    await withBulkProcessing(
      setBulkProcessingMessage,
      setSaving,
      `Adding categories to ${ids.length} menu ${ids.length === 1 ? 'item' : 'items'}…`,
      async () => {
        await appendProductCategories(ids, categoryIds);
        toast.success(
          `Added categories to ${ids.length} menu ${ids.length === 1 ? 'item' : 'items'}.`,
        );
        clearSelection();
        await loadItems();
      },
    ).catch((err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to add categories to menu items.',
      );
    });
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
            <div className="flex items-center gap-2">
              <RefreshTableButton
                onClick={() => void loadItems()}
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

            <div className="space-y-3">
              <ProductCategoryGroupFilterStrip
                id="menu-category-group-filter"
                value={categoryGroupFilter}
                onValueChange={(nextValue) => {
                  onCategoryGroupFilterChange(nextValue);
                  setCategoryFilter('all');
                }}
                sections={categoryFilterSections}
                products={items}
                productCountByGroupId={productCountByGroupId}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  placeholder="Search by name, description or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full max-w-sm"
                />
                <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="category-filter" className="whitespace-nowrap">
                      Category
                    </Label>
                    <CategoryFilterSelect
                      id="category-filter"
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                      sections={scopedCategoryFilterSections}
                      productCountByCategoryId={productCountByCategoryId}
                      totalProductCount={scopedTotalProductCount}
                      triggerClassName="w-40"
                    />
                  </div>
                <PublishedFilterSelect
                  id="menu-published-filter"
                  value={publishedFilter}
                  onValueChange={setPublishedFilter}
                />
                {selectedCount > 0 ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkAddCategoryOpen(true)}
                      disabled={saving}
                    >
                      <FolderPlus className="size-4" />
                      Add to category
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setBulkPublishOpen(true)}
                      disabled={saving}
                    >
                      <Globe className="size-4" />
                      Publish {selectedCount}{' '}
                      {selectedCount === 1 ? 'item' : 'items'}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteOpen(true)}
                      disabled={saving}
                    >
                      <Trash2 className="size-4" />
                      Delete {selectedCount}{' '}
                      {selectedCount === 1 ? 'item' : 'items'}
                    </Button>
                  </div>
                ) : null}
              </div>
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
              <div className="space-y-4">
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
                          disabled={saving || filteredItems.length === 0}
                          aria-label="Select all menu items on this page"
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
                        label="Name"
                        column="name"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Category
                      </th>
                      <SortableHeader
                        label="Price"
                        column="price"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Popular
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
                    {paginatedFilteredItems.map((item) => {
                      const thumb = previewFromParsedMenuImages(
                        parseMenuImageUrls(item.image_urls),
                        [256, 512, 1024, 1920],
                      );
                      return (
                      <tr
                        key={item.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${
                          selectedIds.has(item.id) ? 'bg-muted/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={selectedIds.has(item.id)}
                            disabled={saving}
                            aria-label={`Select menu item ${item.name}`}
                            onPointerDown={onRowCheckboxPointerDown}
                            onChange={onRowCheckboxChange(item.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">
                          {item.id}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center gap-2.5">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                className="size-8 shrink-0 rounded-md border object-cover bg-muted"
                              />
                            ) : (
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </div>
                            )}
                            <span className="min-w-0">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatProductCategoryCell(
                            item.categoryIds,
                            item.primaryCategoryId,
                            categoryNameById,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          ${Number(item.price).toFixed(2)}
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
                        <td className="px-4 py-3">
                          <Badge
                            variant={item.is_published ? 'default' : 'secondary'}
                          >
                            {item.is_published ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <InlineSortOrderInput
                            value={item.sort_order}
                            disabled={inlineSortSavingId === item.id || saving}
                            onCommit={(sortOrder) =>
                              handleInlineSortOrderSave(item.id, sortOrder)
                            }
                          />
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
                    );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                totalRecords={totalRecords}
                page={page}
                perPage={perPage}
                totalPages={totalPages}
                perPageOptions={perPageOptions}
                onPageChange={setPage}
                onPerPageChange={onPerPageChange}
              />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && imageUploadBusy) return;
          setDialogOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto"
          showCloseButton={!imageUploadBusy}
          onInteractOutside={(event) => {
            if (imageUploadBusy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (imageUploadBusy) event.preventDefault();
          }}
        >
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
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: slugFromName(name),
                  }));
                }}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="menu-slug">Slug</Label>
              <Input
                id="menu-slug"
                readOnly
                value={form.slug}
                className="cursor-default bg-muted text-foreground"
                aria-readonly="true"
                tabIndex={-1}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <ProductCategoriesFields
                idPrefix="menu"
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
            </div>
            <div className="grid gap-2 md:col-span-2">
              <ImageUpload
                label="Menu item image"
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
                uploadResizes={[...MENU_IMAGE_UPLOAD_RESIZES]}
                isUploading={isUploadingImages}
                disabled={saving || imageUploadBusy}
                shape="square"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <MenuAdditionalImages
                images={form.additional_images}
                onAdd={handleAdditionalImageUpload}
                onRemove={handleAdditionalImageRemove}
                isUploading={isUploadingAdditionalImages}
                disabled={saving || imageUploadBusy}
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
              <Label htmlFor="menu-energy">Energy (kJ)</Label>
              <Input
                id="menu-energy"
                type="number"
                min={0}
                step={1}
                value={form.energy}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    energy: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="menu-spicy-level">Spicy level</Label>
              <Select
                value={String(form.spicy_level)}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    spicy_level: Number(value) || 0,
                  }))
                }
              >
                <SelectTrigger id="menu-spicy-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPICY_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="menu-published">Published</Label>
              <Select
                value={form.is_published ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, is_published: value === 'yes' }))
                }
              >
                <SelectTrigger id="menu-published">
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
            <ProductShippingFields
              idPrefix="menu"
              value={form}
              onChange={(shipping) => setForm((f) => ({ ...f, ...shipping }))}
              disabled={saving || imageUploadBusy}
            />
            <div className="md:col-span-2">
              <MenuFoodContentEditor
                value={form.food_content}
                onChange={(food_content) =>
                  setForm((f) => ({ ...f, food_content }))
                }
                disabled={saving || imageUploadBusy}
              />
            </div>
            <div className="md:col-span-2">
              <MenuIngredientsEditor
                value={form.ingredients}
                onChange={(ingredients) =>
                  setForm((f) => ({ ...f, ingredients }))
                }
                disabled={saving || imageUploadBusy}
                menuItemId={form.id}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving || imageUploadBusy}
            >
              Cancel
            </Button>
            {editingId !== null ? (
              <Button
                variant="outline"
                onClick={() => void openDuplicateDialog()}
                disabled={saving || imageUploadBusy}
              >
                Duplicate…
              </Button>
            ) : null}
            <Button
              onClick={() => void handleSave()}
              disabled={saving || imageUploadBusy}
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
        open={duplicateDialogOpen}
        onOpenChange={(open) => !open && setDuplicateDialogOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate menu item</AlertDialogTitle>
            <AlertDialogDescription>
              Latest ID: {duplicateLatestId ?? '—'}. Enter a new ID for the copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="menu-duplicate-id">New ID</Label>
            <Input
              id="menu-duplicate-id"
              type="number"
              min={1}
              value={duplicateIdDraft}
              onChange={(e) => setDuplicateIdDraft(e.target.value)}
              disabled={saving}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleDuplicateConfirm();
              }}
            >
              OK
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

      <BulkAddToCategoryDialog
        open={bulkAddCategoryOpen}
        onOpenChange={setBulkAddCategoryOpen}
        sections={categoryFilterSections}
        selectedCount={selectedCount}
        itemLabel="menu item"
        saving={saving}
        onConfirm={handleBulkAddToCategory}
      />

      <AlertDialog
        open={bulkPublishOpen}
        onOpenChange={(open) => !open && setBulkPublishOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publish {selectedCount} menu {selectedCount === 1 ? 'item' : 'items'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will set {selectedCount} menu{' '}
              {selectedCount === 1 ? 'item' : 'items'} to published and make{' '}
              {selectedCount === 1 ? 'it' : 'them'} visible on the storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void handleBulkPublish();
              }}
            >
              Publish
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
              Delete {selectedCount} menu {selectedCount === 1 ? 'item' : 'items'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedCount} menu{' '}
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

      <BulkProcessingOverlay
        open={bulkProcessingMessage != null}
        message={bulkProcessingMessage ?? 'Processing…'}
      />
    </DashboardLayout>
  );
}

