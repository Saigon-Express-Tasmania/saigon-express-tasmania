import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PublishedFilterValue = 'all' | 'published' | 'unpublished';

type PublishedFilterSelectProps = {
  id: string;
  value: PublishedFilterValue;
  onValueChange: (value: PublishedFilterValue) => void;
  triggerClassName?: string;
};

export function matchesPublishedFilter(
  isPublished: boolean,
  filter: PublishedFilterValue,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'published') return isPublished;
  return !isPublished;
}

export function PublishedFilterSelect({
  id,
  value,
  onValueChange,
  triggerClassName,
}: PublishedFilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="whitespace-nowrap">
        Published
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={cn('w-36', triggerClassName)}>
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="unpublished">Unpublished</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
