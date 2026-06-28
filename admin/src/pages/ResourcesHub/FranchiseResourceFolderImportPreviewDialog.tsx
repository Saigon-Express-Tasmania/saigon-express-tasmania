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
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  buildCategoryLabelFromSubfolder,
  normalizeCategoryNameLabel,
  type FolderImportPreview,
  type FolderImportPreviewCategory,
} from './franchiseResourceFolderImport';

function SortOrderBadge({ sortOrder }: { sortOrder: number }) {
  return (
    <Badge
      variant="secondary"
      className="shrink-0 font-mono text-[10px] tabular-nums"
    >
      {String(sortOrder).padStart(2, '0')}
    </Badge>
  );
}

type FranchiseResourceFolderImportPreviewDialogProps = {
  preview: FolderImportPreview | null;
  open: boolean;
  includeParentPrefix: boolean;
  onIncludeParentPrefixChange: (value: boolean) => void;
  removeUnderscoresFromCategoryNames: boolean;
  onRemoveUnderscoresFromCategoryNamesChange: (value: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function FranchiseResourceFolderImportPreviewDialog({
  preview,
  open,
  includeParentPrefix,
  onIncludeParentPrefixChange,
  removeUnderscoresFromCategoryNames,
  onRemoveUnderscoresFromCategoryNamesChange,
  onOpenChange,
  onConfirm,
  onCancel,
}: FranchiseResourceFolderImportPreviewDialogProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!preview) {
      setExpandedCategories(new Set());
      return;
    }
    setExpandedCategories(new Set(preview.categories.map((c) => c.alias)));
  }, [preview]);

  const toggleCategory = (alias: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(alias)) {
        next.delete(alias);
      } else {
        next.add(alias);
      }
      return next;
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel();
    }
    onOpenChange(nextOpen);
  };

  if (!preview) return null;

  const canUseParentPrefix = preview.parentFolderName != null;
  const lockParentPrefix = preview.hasRootLevelFiles;
  const displayParentFolderName =
    removeUnderscoresFromCategoryNames && preview.parentFolderName
      ? normalizeCategoryNameLabel(preview.parentFolderName)
      : preview.parentFolderName;
  const resolvedCategoryLabel = (category: FolderImportPreviewCategory) =>
    buildCategoryLabelFromSubfolder(category.subfolderName, {
      parentFolderName: preview.parentFolderName,
      includeParentPrefix,
      removeUnderscores: removeUnderscoresFromCategoryNames,
      nestedParentSubfolderName: category.nestedParentSubfolderName,
      isRootLevelFile: category.isRootLevelFile,
    }).categoryLabel;

  const categoriesToCreate = preview.categories.filter(
    (category) => category.action === 'create',
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Confirm folder import</DialogTitle>
          <DialogDescription>
            Review categories and documents before importing{' '}
            {preview.totalFiles} file{preview.totalFiles === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-start gap-3">
              <input
                id="folder-import-parent-prefix"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border border-input"
                checked={includeParentPrefix}
                disabled={!canUseParentPrefix || lockParentPrefix}
                onChange={(event) =>
                  onIncludeParentPrefixChange(event.target.checked)
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="folder-import-parent-prefix"
                  className={`text-sm font-medium ${
                    canUseParentPrefix ? '' : 'text-muted-foreground'
                  }`}
                >
                  Include parent folder name as prefix of categories
                </Label>
                <p className="text-xs text-muted-foreground">
                  {canUseParentPrefix ? (
                    lockParentPrefix ? (
                      <>
                        Required because this import includes files in the root
                        folder. Sub-folders will be named like{' '}
                        <span className="font-medium text-foreground">
                          {displayParentFolderName} / Subfolder
                        </span>
                        , and root files use{' '}
                        <span className="font-medium text-foreground">
                          {displayParentFolderName}
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Categories will be named like{' '}
                        <span className="font-medium text-foreground">
                          {displayParentFolderName} / Subfolder
                        </span>
                        . Only one parent level is supported.
                      </>
                    )
                  ) : (
                    'Select a folder with files in the root, Category/document.pdf files, Parent/Child/document.pdf nested folders, or a wrapper directory (e.g. imports/Parent/Child/file.pdf).'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="flex items-start gap-3">
              <input
                id="folder-import-remove-underscores"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border border-input"
                checked={removeUnderscoresFromCategoryNames}
                onChange={(event) =>
                  onRemoveUnderscoresFromCategoryNamesChange(
                    event.target.checked,
                  )
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="folder-import-remove-underscores"
                  className="text-sm font-medium"
                >
                  Remove underscores from category names
                </Label>
                <p className="text-xs text-muted-foreground">
                  Underscores in sub-folder and parent folder names are replaced
                  with spaces. Numeric sort prefixes work with underscores or
                  spaces, e.g.{' '}
                  <span className="font-medium text-foreground">
                    00_READ_ME_FIRST
                  </span>{' '}
                  or{' '}
                  <span className="font-medium text-foreground">
                    00 READ ME FIRST
                  </span>{' '}
                  both become{' '}
                  <span className="font-medium text-foreground">
                    READ ME FIRST
                  </span>
                  {canUseParentPrefix && removeUnderscoresFromCategoryNames ? (
                    <>
                      {' '}
                      and{' '}
                      <span className="font-medium text-foreground">
                        {preview.parentFolderName} / READ_ME_FIRST
                      </span>{' '}
                      becomes{' '}
                      <span className="font-medium text-foreground">
                        {displayParentFolderName} / READ ME FIRST
                      </span>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            </div>
          </div>

          {categoriesToCreate.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">
                Categories to create ({categoriesToCreate.length})
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {categoriesToCreate.map((category) => (
                  <li key={category.alias} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      New
                    </Badge>
                    <span className="min-w-0 flex-1 truncate">
                      {resolvedCategoryLabel(category)}
                    </span>
                    <SortOrderBadge sortOrder={category.sortOrder} />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              No new categories will be created. Existing categories will be
              reused.
            </p>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Documents by category</h3>
            <div className="space-y-2">
              {preview.categories.map((category) => {
                const expanded = expandedCategories.has(category.alias);
                const createCount = category.documents.filter(
                  (doc) => doc.action === 'create',
                ).length;
                const updateCount = category.documents.length - createCount;

                return (
                  <div
                    key={category.alias}
                    className="overflow-hidden rounded-md border border-border"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                      onClick={() => toggleCategory(category.alias)}
                      aria-expanded={expanded}
                    >
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          expanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {resolvedCategoryLabel(category)}
                      </span>
                      {category.action === 'create' ? (
                        <Badge variant="outline" className="text-[10px]">
                          New category
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {category.documents.length} file
                        {category.documents.length === 1 ? '' : 's'}
                        {createCount > 0 || updateCount > 0 ? (
                          <>
                            {' '}
                            ({createCount} new
                            {updateCount > 0 ? `, ${updateCount} update` : ''})
                          </>
                        ) : null}
                      </span>
                      <SortOrderBadge sortOrder={category.sortOrder} />
                    </button>
                    {expanded ? (
                      <ul className="border-t border-border bg-muted/20 px-3 py-2">
                        {category.documents.map((document) => (
                          <li
                            key={document.slug}
                            className="flex items-center gap-2 py-1 text-sm"
                          >
                            <Badge
                              variant={
                                document.action === 'create'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-[10px]"
                            >
                              {document.action === 'create' ? 'Create' : 'Update'}
                            </Badge>
                            <span className="min-w-0 truncate">
                              {document.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Import {preview.totalFiles} file
            {preview.totalFiles === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
