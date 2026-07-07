import { GroupedCategoryMultiSelect } from '@/components/GroupedCategoryMultiSelect';
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
import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type BulkAddToCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: AdminCategoryFilterSection[];
  selectedCount: number;
  itemLabel: string;
  saving?: boolean;
  onConfirm: (categoryIds: number[]) => Promise<void>;
};

export function BulkAddToCategoryDialog({
  open,
  onOpenChange,
  sections,
  selectedCount,
  itemLabel,
  saving = false,
  onConfirm,
}: BulkAddToCategoryDialogProps) {
  const [categoryIds, setCategoryIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setCategoryIds([]);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (categoryIds.length === 0) return;
    await onConfirm(categoryIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to category</DialogTitle>
          <DialogDescription>
            Assign {selectedCount} selected {itemLabel}
            {selectedCount === 1 ? '' : 's'} to one or more categories. Existing
            category assignments are kept.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor="bulk-add-categories">Categories</Label>
          <GroupedCategoryMultiSelect
            id="bulk-add-categories"
            sections={sections}
            values={categoryIds.map(String)}
            onValuesChange={(nextValues) =>
              setCategoryIds(nextValues.map((value) => Number(value)))
            }
            disabled={saving}
            placeholder="Search categories…"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving || categoryIds.length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'OK'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
