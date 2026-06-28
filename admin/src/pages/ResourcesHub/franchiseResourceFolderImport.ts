export const FOLDER_IMPORT_BATCH_SIZE = 3;

export const ALLOWED_IMPORT_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
  'txt',
]);

export type ParsedFolderImportFile = {
  file: File;
  subfolderName: string;
  nestedParentSubfolderName: string | null;
  /** File sits directly in the selected/imported root folder. */
  isRootLevelFile?: boolean;
};

export const CATEGORY_PARENT_CHILD_SEPARATOR = ' / ';

export type FolderImportProgress = {
  phase: 'preparing' | 'importing';
  processed: number;
  total: number;
  batch: number;
  batchCount: number;
  currentLabel?: string;
};

export type FolderImportPreviewDocument = {
  title: string;
  slug: string;
  action: 'create' | 'update';
};

export type FolderImportPreviewCategory = {
  baseSubfolderName: string;
  subfolderName: string;
  nestedParentSubfolderName: string | null;
  isRootLevelFile: boolean;
  alias: string;
  sortOrder: number;
  action: 'create' | 'existing';
  documents: FolderImportPreviewDocument[];
};

export type FolderImportPreview = {
  categories: FolderImportPreviewCategory[];
  totalFiles: number;
  newCategoryCount: number;
  newDocumentCount: number;
  updateDocumentCount: number;
  parentFolderName: string | null;
  hasRootLevelFiles: boolean;
};

export function formatCategoryLabel(
  subfolderName: string,
  parentFolderName: string | null,
  includeParentPrefix: boolean,
): string {
  if (includeParentPrefix && parentFolderName?.trim()) {
    return `${parentFolderName.trim()}${CATEGORY_PARENT_CHILD_SEPARATOR}${subfolderName}`;
  }
  return subfolderName;
}

export function normalizeCategoryNameLabel(name: string): string {
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export type FolderImportCategoryLabelOptions = {
  parentFolderName?: string | null;
  includeParentPrefix?: boolean;
  removeUnderscores?: boolean;
};

export function resolveImportedCategoryLabel(
  baseSubfolderName: string,
  options?: FolderImportCategoryLabelOptions,
): string {
  const parentFolderName = options?.parentFolderName ?? null;
  const includeParentPrefix = options?.includeParentPrefix ?? false;
  const removeUnderscores = options?.removeUnderscores ?? false;
  const name = removeUnderscores
    ? normalizeCategoryNameLabel(baseSubfolderName)
    : baseSubfolderName;
  const parent =
    removeUnderscores && parentFolderName?.trim()
      ? normalizeCategoryNameLabel(parentFolderName.trim())
      : parentFolderName;
  return formatCategoryLabel(name, parent, includeParentPrefix);
}

export function resolveNestedImportedCategoryLabel(
  parentBaseSubfolderName: string,
  childBaseSubfolderName: string,
  options?: FolderImportCategoryLabelOptions,
): string {
  const removeUnderscores = options?.removeUnderscores ?? false;
  const parentName = removeUnderscores
    ? normalizeCategoryNameLabel(parentBaseSubfolderName)
    : parentBaseSubfolderName;
  const childName = removeUnderscores
    ? normalizeCategoryNameLabel(childBaseSubfolderName)
    : childBaseSubfolderName;
  const nestedLabel = `${parentName}${CATEGORY_PARENT_CHILD_SEPARATOR}${childName}`;
  const parentFolderName = options?.parentFolderName ?? null;
  const includeParentPrefix = options?.includeParentPrefix ?? false;
  if (!includeParentPrefix || !parentFolderName?.trim()) {
    return nestedLabel;
  }
  const selectedRoot = removeUnderscores
    ? normalizeCategoryNameLabel(parentFolderName.trim())
    : parentFolderName.trim();
  return `${selectedRoot}${CATEGORY_PARENT_CHILD_SEPARATOR}${nestedLabel}`;
}

export function buildCategoryLabelFromSubfolder(
  rawSubfolderName: string,
  options?: FolderImportCategoryLabelOptions & {
    nestedParentSubfolderName?: string | null;
    isRootLevelFile?: boolean;
  },
): { label: string; sortOrder: number; categoryLabel: string } {
  if (options?.isRootLevelFile) {
    const rootName = (options.parentFolderName ?? rawSubfolderName).trim();
    const removeUnderscores = options.removeUnderscores ?? false;
    const { label, sortOrder } = parseSubfolderCategoryName(rootName);
    const categoryLabel = removeUnderscores
      ? normalizeCategoryNameLabel(label)
      : label;
    return { label: categoryLabel, sortOrder, categoryLabel };
  }

  const { label, sortOrder } = parseSubfolderCategoryName(rawSubfolderName);
  const nestedParent = options?.nestedParentSubfolderName?.trim() || null;

  if (nestedParent) {
    const parentParsed = parseSubfolderCategoryName(nestedParent);
    return {
      label,
      sortOrder,
      categoryLabel: resolveNestedImportedCategoryLabel(
        parentParsed.label,
        label,
        options,
      ),
    };
  }

  return {
    label,
    sortOrder,
    categoryLabel: resolveImportedCategoryLabel(label, options),
  };
}

const CATEGORY_LABEL_PATH_SPLIT = /\s*\/\s*/;

export function categoryLabelToStorageFolderSegments(
  categoryLabel: string,
  slugifyFn: (text: string) => string,
): string[] {
  return categoryLabel
    .split(CATEGORY_LABEL_PATH_SPLIT)
    .map((segment) => slugifyFn(segment.trim()))
    .filter(Boolean);
}

export function categoryLabelToStorageFolderPath(
  categoryLabel: string,
  slugifyFn: (text: string) => string,
): string {
  return categoryLabelToStorageFolderSegments(categoryLabel, slugifyFn).join('/');
}

export function categoryLabelToSlugPrefix(
  categoryLabel: string,
  slugifyFn: (text: string) => string,
): string {
  return categoryLabelToStorageFolderSegments(categoryLabel, slugifyFn).join('-');
}

export function buildImportedDocumentUploadFolder(
  uploadFolder: string,
  categoryLabel: string,
  slugifyFn: (text: string) => string,
): string {
  const categoryPath = categoryLabelToStorageFolderPath(categoryLabel, slugifyFn);
  return categoryPath ? `${uploadFolder}/${categoryPath}` : uploadFolder;
}

const NUMERIC_SUBFOLDER_PREFIX = /^(\d+)(?:_|\s+)(.+)$/;

export function parseSubfolderCategoryName(rawSubfolderName: string): {
  label: string;
  sortOrder: number;
} {
  const trimmed = rawSubfolderName.trim();
  const match = trimmed.match(NUMERIC_SUBFOLDER_PREFIX);
  if (!match) {
    return { label: trimmed, sortOrder: 0 };
  }

  const sortOrder = Number.parseInt(match[1], 10);
  const label = match[2].trim();
  if (!label) {
    return { label: trimmed, sortOrder: 0 };
  }

  return {
    label,
    sortOrder: Number.isNaN(sortOrder) || sortOrder < 0 ? 0 : sortOrder,
  };
}

export function folderImportHasNestedSubfolders(
  parsed: ParsedFolderImportFile[],
): boolean {
  return parsed.some((item) => item.nestedParentSubfolderName != null);
}

export function folderImportHasRootLevelFiles(
  parsed: ParsedFolderImportFile[],
): boolean {
  return parsed.some((item) => item.isRootLevelFile === true);
}

export function defaultIncludeParentFolderPrefix(
  parsed: ParsedFolderImportFile[],
): boolean {
  if (folderImportHasRootLevelFiles(parsed)) return true;
  return !folderImportHasNestedSubfolders(parsed);
}

function compareSubfolderCategoryNames(a: string, b: string): number {
  const parsedA = parseSubfolderCategoryName(a);
  const parsedB = parseSubfolderCategoryName(b);
  const aExplicit = parsedA.sortOrder !== 0;
  const bExplicit = parsedB.sortOrder !== 0;
  if (aExplicit && bExplicit) return parsedA.sortOrder - parsedB.sortOrder;
  if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
  return parsedA.label.localeCompare(parsedB.label, undefined, {
    sensitivity: 'base',
  });
}

export function detectCommonRootFolderName(
  files: File[],
  selectedRootName?: string | null,
): string | null {
  const trimmedRoot = selectedRootName?.trim();
  if (trimmedRoot) return trimmedRoot;

  const fileArray = Array.from(files);
  if (fileArray.length === 0) return null;

  let sharedRoot: string | null = null;
  let sawMultiSegmentPath = false;

  for (const file of fileArray) {
    if (!isAllowedImportFile(file)) continue;
    const segments = splitRelativePath(relativePathForFile(file));
    if (segments.length < 2) continue;
    sawMultiSegmentPath = true;
    const root = segments[0];
    if (sharedRoot == null) {
      sharedRoot = root;
    } else if (sharedRoot !== root) {
      return null;
    }
  }

  return sawMultiSegmentPath ? sharedRoot : null;
}

export function detectParentFolderName(
  files: File[],
  selectedRootName?: string | null,
): string | null {
  return detectCommonRootFolderName(files, selectedRootName);
}

function subfolderGroupKey(item: ParsedFolderImportFile): string {
  if (item.isRootLevelFile) return '__root__';
  if (item.nestedParentSubfolderName) {
    return `${item.nestedParentSubfolderName}/${item.subfolderName}`;
  }
  return item.subfolderName;
}

export function previewBaseSubfolderName(item: ParsedFolderImportFile): string {
  if (item.isRootLevelFile) {
    return parseSubfolderCategoryName(item.subfolderName).label;
  }
  if (!item.nestedParentSubfolderName) {
    return parseSubfolderCategoryName(item.subfolderName).label;
  }
  const parentLabel = parseSubfolderCategoryName(
    item.nestedParentSubfolderName,
  ).label;
  const childLabel = parseSubfolderCategoryName(item.subfolderName).label;
  return `${parentLabel}${CATEGORY_PARENT_CHILD_SEPARATOR}${childLabel}`;
}

type DirectoryHandleIterable = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
};

export async function readFolderImportFilesFromDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle,
): Promise<{ files: File[]; selectedRootName: string }> {
  const files: File[] = [];
  const selectedRootName = directoryHandle.name;
  const root = directoryHandle as DirectoryHandleIterable;

  const assignRelativePath = (file: File, relativePath: string) => {
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    files.push(file);
  };

  for await (const [entryName, handle] of root.entries()) {
    if (handle.kind === 'directory') {
      const subdir = handle as DirectoryHandleIterable;
      for await (const [innerName, innerHandle] of subdir.entries()) {
        if (innerHandle.kind === 'file') {
          const file = await (innerHandle as FileSystemFileHandle).getFile();
          assignRelativePath(file, `${entryName}/${innerName}`);
          continue;
        }

        if (innerHandle.kind === 'directory') {
          const nestedDir = innerHandle as DirectoryHandleIterable;
          for await (const [fileName, fileHandle] of nestedDir.entries()) {
            if (fileHandle.kind !== 'file') continue;
            const file = await (fileHandle as FileSystemFileHandle).getFile();
            assignRelativePath(file, `${entryName}/${innerName}/${fileName}`);
          }
        }
      }
      continue;
    }

    if (handle.kind === 'file') {
      const file = await (handle as FileSystemFileHandle).getFile();
      assignRelativePath(file, entryName);
    }
  }

  return { files, selectedRootName };
}

export function fileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return '';
  return trimmed.slice(lastDot + 1).toLowerCase();
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'text/plain': 'txt',
};

export function isAllowedImportFile(file: File): boolean {
  const ext = fileExtension(file.name);
  if (ALLOWED_IMPORT_EXTENSIONS.has(ext)) return true;
  const mimeExt = MIME_TO_EXTENSION[file.type];
  return mimeExt != null && ALLOWED_IMPORT_EXTENSIONS.has(mimeExt);
}

export function splitRelativePath(relativePath: string): string[] {
  return relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
}

function relativePathForFile(file: File): string {
  return (
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
    file.name
  );
}

/**
 * When every file path has 4 segments sharing one prefix (e.g.
 * "imports/Parent/Child/file.pdf"), treat the first segment as a wrapper folder.
 */
export function detectCommonFourSegmentPrefix(files: File[]): string | null {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return null;

  let sharedPrefix: string | null = null;

  for (const file of fileArray) {
    const segments = splitRelativePath(relativePathForFile(file));
    if (segments.length !== 4) return null;
    const prefix = segments[0];
    if (sharedPrefix == null) {
      sharedPrefix = prefix;
    } else if (sharedPrefix !== prefix) {
      return null;
    }
  }

  return sharedPrefix;
}

function stripRootFolderPrefix(
  segments: string[],
  rootFolderName: string | null,
): { segments: string[]; isRootLevelFile: boolean } {
  if (!rootFolderName?.trim()) {
    return { segments, isRootLevelFile: false };
  }

  if (segments.length === 1) {
    return { segments, isRootLevelFile: true };
  }

  if (segments[0] === rootFolderName) {
    const stripped = segments.slice(1);
    if (stripped.length === 1) {
      return { segments: stripped, isRootLevelFile: true };
    }
    return { segments: stripped, isRootLevelFile: false };
  }

  return { segments, isRootLevelFile: false };
}

export function parseFolderImportFileEntry(
  file: File,
  commonFourSegmentPrefix: string | null,
  rootFolderName: string | null = null,
): ParsedFolderImportFile | null {
  if (!isAllowedImportFile(file)) return null;

  const rawSegments = splitRelativePath(relativePathForFile(file));
  const { segments, isRootLevelFile } = stripRootFolderPrefix(
    rawSegments,
    rootFolderName,
  );

  if (isRootLevelFile) {
    if (!rootFolderName?.trim()) return null;
    return {
      file,
      subfolderName: rootFolderName.trim(),
      nestedParentSubfolderName: null,
      isRootLevelFile: true,
    };
  }

  if (segments.length === 2) {
    return {
      file,
      subfolderName: segments[0],
      nestedParentSubfolderName: null,
    };
  }

  if (segments.length === 3) {
    return {
      file,
      subfolderName: segments[1],
      nestedParentSubfolderName: segments[0],
    };
  }

  if (
    segments.length === 4 &&
    commonFourSegmentPrefix != null &&
    segments[0] === commonFourSegmentPrefix
  ) {
    return {
      file,
      subfolderName: segments[2],
      nestedParentSubfolderName: segments[1],
    };
  }

  return null;
}

/**
 * Keep files in supported sub-folder layouts:
 * - file.pdf (root of selected folder)
 * - RootFolder/file.pdf (root-level when folder picked via webkitdirectory)
 * - Category/file.pdf
 * - Parent/Child/file.pdf (category = Parent / Child)
 * - imports/Parent/Child/file.pdf (wrapper + nested category)
 */
export function parseFolderImportFiles(
  files: FileList | File[],
  rootFolderName?: string | null,
): ParsedFolderImportFile[] {
  const fileArray = Array.from(files);
  const resolvedRootFolderName = detectCommonRootFolderName(
    fileArray,
    rootFolderName,
  );
  const commonFourSegmentPrefix = detectCommonFourSegmentPrefix(fileArray);
  const parsed: ParsedFolderImportFile[] = [];

  for (const file of fileArray) {
    const entry = parseFolderImportFileEntry(
      file,
      commonFourSegmentPrefix,
      resolvedRootFolderName,
    );
    if (entry) parsed.push(entry);
  }

  return parsed;
}

export type FolderImportParseDiagnostics = {
  totalFiles: number;
  allowedTypeCount: number;
  directSubfolderCount: number;
  samplePaths: string[];
};

export function diagnoseFolderImportFiles(
  files: FileList | File[],
  rootFolderName?: string | null,
): FolderImportParseDiagnostics {
  const fileArray = Array.from(files);
  const resolvedRootFolderName = detectCommonRootFolderName(
    fileArray,
    rootFolderName,
  );
  const commonFourSegmentPrefix = detectCommonFourSegmentPrefix(fileArray);

  let allowedTypeCount = 0;
  let directSubfolderCount = 0;

  for (const file of fileArray) {
    if (!isAllowedImportFile(file)) continue;
    allowedTypeCount += 1;
    if (
      parseFolderImportFileEntry(
        file,
        commonFourSegmentPrefix,
        resolvedRootFolderName,
      )
    ) {
      directSubfolderCount += 1;
    }
  }

  return {
    totalFiles: fileArray.length,
    allowedTypeCount,
    directSubfolderCount,
    samplePaths: fileArray
      .slice(0, 5)
      .map((file) => relativePathForFile(file) || file.name),
  };
}

export function chunkImportBatch<T>(
  items: T[],
  batchSize = FOLDER_IMPORT_BATCH_SIZE,
): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  return chunks;
}

export function groupParsedFilesBySubfolder(
  parsed: ParsedFolderImportFile[],
): Map<string, ParsedFolderImportFile[]> {
  const grouped = new Map<string, ParsedFolderImportFile[]>();

  for (const item of parsed) {
    const key = subfolderGroupKey(item);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
}

function compareParsedSubfolderGroups(
  a: ParsedFolderImportFile,
  b: ParsedFolderImportFile,
): number {
  const parentA = a.nestedParentSubfolderName ?? '';
  const parentB = b.nestedParentSubfolderName ?? '';
  const parentCmp = parentA.localeCompare(parentB, undefined, {
    sensitivity: 'base',
  });
  if (parentCmp !== 0) return parentCmp;
  return compareSubfolderCategoryNames(a.subfolderName, b.subfolderName);
}

export function buildImportedDocumentSlug(
  categoryLabel: string,
  title: string,
  slugifyFn: (text: string) => string,
): string {
  const titleSlug = slugifyFn(title);
  const categorySlug = categoryLabelToSlugPrefix(categoryLabel, slugifyFn);
  if (!titleSlug) {
    throw new Error(`Could not derive slug from "${title}".`);
  }
  if (!categorySlug) {
    throw new Error(`Could not derive category slug from "${categoryLabel}".`);
  }
  return `${categorySlug}-${titleSlug}`;
}

export function previewImportedDocumentSlug(
  categoryLabel: string,
  title: string,
  slugifyFn: (text: string) => string,
): string {
  return buildImportedDocumentSlug(categoryLabel, title, slugifyFn);
}

export function buildFolderImportPreview(
  parsed: ParsedFolderImportFile[],
  existingCategoryIdByAlias: Map<string, number>,
  existingDocumentSlugs: Set<string>,
  slugify: (text: string) => string,
  titleFromFileName: (fileName: string) => string,
  options?: {
    parentFolderName?: string | null;
    includeParentPrefix?: boolean;
    removeUnderscores?: boolean;
  },
): FolderImportPreview {
  const parentFolderName = options?.parentFolderName ?? null;
  const includeParentPrefix = options?.includeParentPrefix ?? false;
  const removeUnderscores = options?.removeUnderscores ?? false;
  const labelOptions: FolderImportCategoryLabelOptions = {
    parentFolderName,
    includeParentPrefix,
    removeUnderscores,
  };
  const grouped = groupParsedFilesBySubfolder(parsed);
  const categories: FolderImportPreviewCategory[] = [];
  let newCategoryCount = 0;
  let newDocumentCount = 0;
  let updateDocumentCount = 0;

  const subfolderNames = [...grouped.keys()].sort((keyA, keyB) => {
    const itemA = grouped.get(keyA)?.[0];
    const itemB = grouped.get(keyB)?.[0];
    if (!itemA || !itemB) return keyA.localeCompare(keyB);
    return compareParsedSubfolderGroups(itemA, itemB);
  });

  for (const groupKey of subfolderNames) {
    const items = grouped.get(groupKey) ?? [];
    const sample = items[0];
    if (!sample) continue;
    const { sortOrder, categoryLabel } = buildCategoryLabelFromSubfolder(
      sample.subfolderName,
      {
        ...labelOptions,
        nestedParentSubfolderName: sample.nestedParentSubfolderName,
        isRootLevelFile: sample.isRootLevelFile === true,
      },
    );
    const baseSubfolderName = previewBaseSubfolderName(sample);
    const alias = slugify(categoryLabel);
    const categoryId = existingCategoryIdByAlias.get(alias) ?? null;
    const categoryAction = categoryId != null ? 'existing' : 'create';

    if (categoryAction === 'create') {
      newCategoryCount += 1;
    }

    const documents = items
      .map((item) => {
        const title = titleFromFileName(item.file.name);
        const slug = previewImportedDocumentSlug(categoryLabel, title, slugify);
        const action: FolderImportPreviewDocument['action'] =
          existingDocumentSlugs.has(slug) ? 'update' : 'create';

        if (action === 'create') {
          newDocumentCount += 1;
        } else {
          updateDocumentCount += 1;
        }

        return { title, slug, action };
      })
      .sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );

    categories.push({
      baseSubfolderName,
      subfolderName: sample.subfolderName,
      nestedParentSubfolderName: sample.nestedParentSubfolderName,
      isRootLevelFile: sample.isRootLevelFile === true,
      alias,
      sortOrder,
      action: categoryAction,
      documents,
    });
  }

  return {
    categories,
    totalFiles: parsed.length,
    newCategoryCount,
    newDocumentCount,
    updateDocumentCount,
    parentFolderName,
    hasRootLevelFiles: folderImportHasRootLevelFiles(parsed),
  };
}
