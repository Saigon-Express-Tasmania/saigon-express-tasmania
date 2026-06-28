import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import supabase from '@/lib/supabase/client';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  buildResourcePayload,
  emptyResourceInput,
  slugify,
  titleFromFileName,
  type FranchiseResourcePageConfig,
} from './franchiseResourceShared';
import {
  buildCategoryLabelFromSubfolder,
  buildFolderImportPreview,
  buildImportedDocumentSlug,
  buildImportedDocumentUploadFolder,
  chunkImportBatch,
  defaultIncludeParentFolderPrefix,
  detectParentFolderName,
  diagnoseFolderImportFiles,
  fileExtension,
  folderImportHasRootLevelFiles,
  FOLDER_IMPORT_BATCH_SIZE,
  parseFolderImportFiles,
  readFolderImportFilesFromDirectoryHandle,
  type FolderImportPreview,
  type FolderImportProgress,
  type ParsedFolderImportFile,
} from './franchiseResourceFolderImport';

type UseFranchiseResourceFolderImportOptions = {
  config: FranchiseResourcePageConfig;
  onComplete: () => Promise<void>;
};

type PreviewBuildOptions = {
  includeParentPrefix: boolean;
  removeUnderscoresFromCategoryNames: boolean;
};

function defaultPreviewBuildOptions(
  parsed: ParsedFolderImportFile[],
): PreviewBuildOptions {
  return {
    includeParentPrefix: defaultIncludeParentFolderPrefix(parsed),
    removeUnderscoresFromCategoryNames: true,
  };
}

type PreviewContext = {
  parsed: ParsedFolderImportFile[];
  existingCategoryIdByAlias: Map<string, number>;
  existingDocumentSlugs: Set<string>;
  parentFolderName: string | null;
};

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key/i.test(error.message ?? '');
}

export function useFranchiseResourceFolderImport({
  config,
  onComplete,
}: UseFranchiseResourceFolderImportOptions) {
  const { uploadMedia } = useSupabaseStorage();
  const { uploadFolder, taxonomyPlace } = config;

  const folderInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<ParsedFolderImportFile[]>([]);
  const previewContextRef = useRef<PreviewContext | null>(null);
  const includeParentPrefixRef = useRef(false);
  const removeUnderscoresRef = useRef(false);
  const [importing, setImporting] = useState(false);
  const [preparingPreview, setPreparingPreview] = useState(false);
  const [preview, setPreview] = useState<FolderImportPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [includeParentPrefix, setIncludeParentPrefix] = useState(false);
  const [
    removeUnderscoresFromCategoryNames,
    setRemoveUnderscoresFromCategoryNames,
  ] = useState(false);
  const [progress, setProgress] = useState<FolderImportProgress | null>(null);

  const rebuildPreview = useCallback(
    (context: PreviewContext, options: PreviewBuildOptions) => {
      return buildFolderImportPreview(
        context.parsed,
        context.existingCategoryIdByAlias,
        context.existingDocumentSlugs,
        slugify,
        titleFromFileName,
        {
          parentFolderName: context.parentFolderName,
          includeParentPrefix: options.includeParentPrefix,
          removeUnderscores: options.removeUnderscoresFromCategoryNames,
        },
      );
    },
    [],
  );

  const ensureCategoryId = useCallback(
    async (
      categoryLabel: string,
      sortOrder: number,
      cache: Map<string, number>,
    ): Promise<number> => {
      const alias = slugify(categoryLabel);
      if (!alias) {
        throw new Error(`Invalid category name: "${categoryLabel}".`);
      }

      const cached = cache.get(alias);
      if (cached != null) return cached;

      const { data: existing, error: lookupError } = await supabase
        .from('franchise_resource_taxonomies')
        .select('id')
        .eq('kind', 'category')
        .eq('alias', alias)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (existing) {
        cache.set(alias, existing.id);
        return existing.id;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('franchise_resource_taxonomies')
        .insert({
          place: taxonomyPlace,
          kind: 'category',
          alias,
          label: categoryLabel,
          sort_order: sortOrder,
          is_active: true,
        })
        .select('id')
        .single();

      if (!insertError && inserted) {
        cache.set(alias, inserted.id);
        return inserted.id;
      }

      if (insertError && isUniqueViolation(insertError)) {
        const { data: raced, error: raceLookupError } = await supabase
          .from('franchise_resource_taxonomies')
          .select('id')
          .eq('kind', 'category')
          .eq('alias', alias)
          .single();

        if (raceLookupError) throw raceLookupError;
        cache.set(alias, raced.id);
        return raced.id;
      }

      throw insertError ?? new Error('Failed to create category.');
    },
    [taxonomyPlace],
  );

  const processFile = useCallback(
    async (
      item: ParsedFolderImportFile,
      categoryId: number,
      categoryLabel: string,
      slugToResourceId: Map<string, number>,
    ) => {
      const title = titleFromFileName(item.file.name);
      const slug = buildImportedDocumentSlug(categoryLabel, title, slugify);
      const titleSlug = slugify(title);
      if (!titleSlug) {
        throw new Error(`Could not derive slug from "${item.file.name}".`);
      }

      const ext = fileExtension(item.file.name) || 'bin';
      const fileName = `${titleSlug}-content-${Date.now()}.${ext}`;
      const storageFolder = buildImportedDocumentUploadFolder(
        uploadFolder,
        categoryLabel,
        slugify,
      );
      const { publicUrl } = await uploadMedia(item.file, {
        folder: storageFolder,
        fileName,
        upsert: true,
      });

      const existingId = slugToResourceId.get(slug);
      if (existingId != null) {
        const { error: updateError } = await supabase
          .from('franchise_resources')
          .update({ content_file: publicUrl })
          .eq('id', existingId);

        if (updateError) throw updateError;
        return;
      }

      const form = {
        ...emptyResourceInput('document'),
        title,
        slug,
        category_id: String(categoryId),
        content_file: publicUrl,
        is_published: true,
        published_at: toDatetimeLocalValue(new Date()),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('franchise_resources')
        .insert(buildResourcePayload(form, 'document'))
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (inserted) {
        slugToResourceId.set(slug, inserted.id);
      }
    },
    [uploadFolder, uploadMedia],
  );

  const runImport = useCallback(
    async (
      parsed: ParsedFolderImportFile[],
      parentFolderName: string | null,
      useParentPrefix: boolean,
      removeUnderscores: boolean,
    ) => {
      if (parsed.length === 0) return;

      const labelOptions = {
        parentFolderName,
        includeParentPrefix: useParentPrefix,
        removeUnderscores,
      };

      setImporting(true);
      setProgress({
        phase: 'preparing',
        processed: 0,
        total: parsed.length,
        batch: 0,
        batchCount: chunkImportBatch(parsed).length,
      });

      const categoryCache = new Map<string, number>();
      const slugToResourceId = new Map<string, number>();
      let succeeded = 0;
      let failed = 0;
      const failures: string[] = [];

      try {
        const { data: existingResources, error: slugLoadError } = await supabase
          .from('franchise_resources')
          .select('id, slug')
          .eq('type', 'document');

        if (slugLoadError) throw slugLoadError;
        for (const row of existingResources ?? []) {
          slugToResourceId.set(row.slug, row.id);
        }

        const batches = chunkImportBatch(parsed);
        let processed = 0;

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
          const batch = batches[batchIndex];

          setProgress({
            phase: 'importing',
            processed,
            total: parsed.length,
            batch: batchIndex + 1,
            batchCount: batches.length,
            currentLabel: batch[0]
              ? `${buildCategoryLabelFromSubfolder(batch[0].subfolderName, {
                  ...labelOptions,
                  nestedParentSubfolderName: batch[0].nestedParentSubfolderName,
                  isRootLevelFile: batch[0].isRootLevelFile === true,
                }).categoryLabel} / ${batch[0].file.name}`
              : undefined,
          });

          for (const item of batch) {
            const { categoryLabel, sortOrder } = buildCategoryLabelFromSubfolder(
              item.subfolderName,
              {
                ...labelOptions,
                nestedParentSubfolderName: item.nestedParentSubfolderName,
                isRootLevelFile: item.isRootLevelFile === true,
              },
            );

            setProgress({
              phase: 'importing',
              processed,
              total: parsed.length,
              batch: batchIndex + 1,
              batchCount: batches.length,
              currentLabel: `${categoryLabel} / ${item.file.name}`,
            });

            try {
              const categoryId = await ensureCategoryId(
                categoryLabel,
                sortOrder,
                categoryCache,
              );
              await processFile(item, categoryId, categoryLabel, slugToResourceId);
              succeeded += 1;
            } catch (err) {
              failed += 1;
              const message =
                err instanceof Error ? err.message : 'Unknown error';
              failures.push(`${item.file.name}: ${message}`);
            }

            processed += 1;
            setProgress({
              phase: 'importing',
              processed,
              total: parsed.length,
              batch: batchIndex + 1,
              batchCount: batches.length,
              currentLabel: `${categoryLabel} / ${item.file.name}`,
            });
          }

          if (batchIndex < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        await onComplete();

        if (failed === 0) {
          toast.success(
            `Imported ${succeeded} file${succeeded === 1 ? '' : 's'}.`,
          );
        } else if (succeeded === 0) {
          toast.error(
            `Import failed for all ${failed} file${failed === 1 ? '' : 's'}.`,
          );
        } else {
          toast.warning(
            `Imported ${succeeded} file${succeeded === 1 ? '' : 's'}, ${failed} failed.`,
          );
        }

        if (failures.length > 0 && failures.length <= 3) {
          for (const failure of failures) {
            toast.error(failure);
          }
        } else if (failures.length > 3) {
          toast.error(`${failures.length} files failed. Check console for details.`);
          console.error('Folder import failures:', failures);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Folder import failed.',
        );
      } finally {
        setImporting(false);
        setProgress(null);
      }
    },
    [ensureCategoryId, onComplete, processFile],
  );

  const preparePreview = useCallback(
    async (files: FileList | File[], selectedRootName?: string | null) => {
      const fileArray = Array.from(files);
      const parsed = parseFolderImportFiles(fileArray, selectedRootName);
      if (parsed.length === 0) {
        const diagnostics = diagnoseFolderImportFiles(fileArray, selectedRootName);
        console.warn('Folder import: no eligible files', diagnostics);

        if (diagnostics.totalFiles === 0) {
          toast.warning('No files found in the selected folder.');
        } else if (diagnostics.allowedTypeCount === 0) {
          toast.warning(
            'No supported file types found. Allowed types: PDF, DOCX, XLSX, PNG, JPG, TXT.',
          );
        } else {
          toast.warning(
            `Found ${diagnostics.allowedTypeCount} supported file${diagnostics.allowedTypeCount === 1 ? '' : 's'}, but none match a supported folder layout. Use files in the selected folder root, Category/document.pdf, Parent/Child/document.pdf, or imports/Parent/Child/document.pdf.`,
          );
        }
        return;
      }

      setPreparingPreview(true);
      try {
        const [categoriesResult, resourcesResult] = await Promise.all([
          supabase
            .from('franchise_resource_taxonomies')
            .select('id, alias')
            .eq('kind', 'category'),
          supabase
            .from('franchise_resources')
            .select('slug')
            .eq('type', 'document'),
        ]);

        if (categoriesResult.error) throw categoriesResult.error;
        if (resourcesResult.error) throw resourcesResult.error;

        const existingCategoryIdByAlias = new Map(
          (categoriesResult.data ?? []).map((row) => [row.alias, row.id]),
        );
        const existingDocumentSlugs = new Set(
          (resourcesResult.data ?? []).map((row) => row.slug),
        );
        const parentFolderName = detectParentFolderName(
          fileArray,
          selectedRootName,
        );

        const context: PreviewContext = {
          parsed,
          existingCategoryIdByAlias,
          existingDocumentSlugs,
          parentFolderName,
        };

        previewContextRef.current = context;
        pendingFilesRef.current = parsed;
        const previewOptions = defaultPreviewBuildOptions(parsed);
        includeParentPrefixRef.current = previewOptions.includeParentPrefix;
        removeUnderscoresRef.current =
          previewOptions.removeUnderscoresFromCategoryNames;
        setIncludeParentPrefix(previewOptions.includeParentPrefix);
        setRemoveUnderscoresFromCategoryNames(
          previewOptions.removeUnderscoresFromCategoryNames,
        );
        setPreview(rebuildPreview(context, previewOptions));
        setPreviewOpen(true);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to prepare folder import.',
        );
        previewContextRef.current = null;
        pendingFilesRef.current = [];
        setPreview(null);
        setPreviewOpen(false);
      } finally {
        setPreparingPreview(false);
      }
    },
    [rebuildPreview],
  );

  const handleIncludeParentPrefixChange = useCallback(
    (value: boolean) => {
      const context = previewContextRef.current;
      if (
        !value &&
        context &&
        folderImportHasRootLevelFiles(context.parsed)
      ) {
        return;
      }
      includeParentPrefixRef.current = value;
      setIncludeParentPrefix(value);
      if (!context) return;
      setPreview(
        rebuildPreview(context, {
          includeParentPrefix: value,
          removeUnderscoresFromCategoryNames: removeUnderscoresRef.current,
        }),
      );
    },
    [rebuildPreview],
  );

  const handleRemoveUnderscoresFromCategoryNamesChange = useCallback(
    (value: boolean) => {
      removeUnderscoresRef.current = value;
      setRemoveUnderscoresFromCategoryNames(value);
      const context = previewContextRef.current;
      if (!context) return;
      setPreview(
        rebuildPreview(context, {
          includeParentPrefix: includeParentPrefixRef.current,
          removeUnderscoresFromCategoryNames: value,
        }),
      );
    },
    [rebuildPreview],
  );

  const confirmImport = useCallback(() => {
    const parsed = pendingFilesRef.current;
    const context = previewContextRef.current;
    const useParentPrefix = includeParentPrefixRef.current;
    const removeUnderscores = removeUnderscoresRef.current;
    const parentFolderName = context?.parentFolderName ?? null;

    setPreviewOpen(false);
    setPreview(null);
    previewContextRef.current = null;
    pendingFilesRef.current = [];
    includeParentPrefixRef.current = false;
    removeUnderscoresRef.current = false;
    setIncludeParentPrefix(false);
    setRemoveUnderscoresFromCategoryNames(false);
    void runImport(parsed, parentFolderName, useParentPrefix, removeUnderscores);
  }, [runImport]);

  const cancelPreview = useCallback(() => {
    setPreviewOpen(false);
    setPreview(null);
    previewContextRef.current = null;
    pendingFilesRef.current = [];
    includeParentPrefixRef.current = false;
    removeUnderscoresRef.current = false;
    setIncludeParentPrefix(false);
    setRemoveUnderscoresFromCategoryNames(false);
  }, []);

  const triggerFolderPick = useCallback(() => {
    if (importing || preparingPreview) return;

    void (async () => {
      if ('showDirectoryPicker' in window) {
        try {
          const handle = await window.showDirectoryPicker();
          const { files, selectedRootName } =
            await readFolderImportFilesFromDirectoryHandle(handle);
          if (files.length === 0) {
            toast.warning('No files found in the selected folder.');
            return;
          }
          await preparePreview(files, selectedRootName);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
        }
      }

      folderInputRef.current?.click();
    })();
  }, [importing, preparePreview, preparingPreview]);

  const handleFolderInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileArray = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (fileArray.length === 0) {
        toast.warning('No files found in the selected folder.');
        return;
      }
      void preparePreview(fileArray);
    },
    [preparePreview],
  );

  return {
    folderInputRef,
    importing,
    preparingPreview,
    preview,
    previewOpen,
    includeParentPrefix,
    removeUnderscoresFromCategoryNames,
    progress,
    triggerFolderPick,
    handleFolderInputChange,
    handleIncludeParentPrefixChange,
    handleRemoveUnderscoresFromCategoryNamesChange,
    confirmImport,
    cancelPreview,
    setPreviewOpen,
    batchSize: FOLDER_IMPORT_BATCH_SIZE,
  };
}
