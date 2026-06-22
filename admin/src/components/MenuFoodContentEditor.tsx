import { Button } from '@/components/ui/button';
import {
  countActiveFoodContentFlags,
  emptyFoodContent,
  FOOD_CONTENT_GROUPS,
  type FoodContent,
} from '@/types/FoodContent';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type MenuFoodContentEditorProps = {
  value: FoodContent;
  onChange: (value: FoodContent) => void;
  disabled?: boolean;
};

function FoodContentCheckbox({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-60"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 rounded border-input accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

export function MenuFoodContentEditor({
  value,
  onChange,
  disabled = false,
}: MenuFoodContentEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const activeCount = countActiveFoodContentFlags(value);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const updateField = (key: keyof FoodContent, checked: boolean) => {
    onChange({ ...value, [key]: checked });
  };

  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        <div>
          <h3 className="text-sm font-semibold">Food content</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Allergens, dietary labels and product attributes.
            {activeCount > 0 ? (
              <span className="ml-1 font-medium text-foreground">
                {activeCount} active
              </span>
            ) : null}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 border-t px-4 pb-4 pt-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || activeCount === 0}
              onClick={() => onChange(emptyFoodContent())}
            >
              Clear all
            </Button>
          </div>

          {FOOD_CONTENT_GROUPS.map((group) => {
            const groupActiveCount = group.fields.filter(
              (field) => value[field.key],
            ).length;
            const groupOpen = expandedGroups[group.id] ?? false;

            return (
              <div key={group.id} className="rounded-md border bg-background">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={groupOpen}
                >
                  <div>
                    <h4 className="text-sm font-medium">{group.title}</h4>
                    {group.description ? (
                      <p className="text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    ) : null}
                    {groupActiveCount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {groupActiveCount} selected
                      </p>
                    ) : null}
                  </div>
                  {groupOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {groupOpen && (
                  <div className="grid gap-2 border-t px-3 py-3 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <FoodContentCheckbox
                        key={field.key}
                        id={`food-content-${field.key}`}
                        label={field.label}
                        checked={value[field.key]}
                        disabled={disabled}
                        onChange={(checked) => updateField(field.key, checked)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
