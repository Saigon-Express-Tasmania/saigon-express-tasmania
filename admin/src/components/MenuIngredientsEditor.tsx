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
import { Textarea } from '@/components/ui/textarea';
import {
  emptyMenuItemNutritionalInformation,
  parseImportedMenuItemIngredientsJson,
  type MenuItemIngredient,
  type MenuItemNutritionalInformation,
} from '@/types/MenuItem';
import { FileJson, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type MenuIngredientsEditorProps = {
  value: MenuItemIngredient;
  onChange: (value: MenuItemIngredient) => void;
  disabled?: boolean;
  menuItemId?: number;
};

function updateTextField<K extends keyof MenuItemIngredient>(
  value: MenuItemIngredient,
  field: K,
  next: MenuItemIngredient[K],
): MenuItemIngredient {
  return { ...value, [field]: next };
}

export function MenuIngredientsEditor({
  value,
  onChange,
  disabled = false,
  menuItemId,
}: MenuIngredientsEditorProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const nutrientEntries = Object.entries(value.nutritionalInformation);

  const handleImport = () => {
    setImportError(null);
    try {
      const imported = parseImportedMenuItemIngredientsJson(
        importText,
        menuItemId,
      );
      onChange(imported);
      setImportText('');
      setImportOpen(false);
      toast.success('Ingredients imported.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import ingredients.';
      setImportError(message);
    }
  };

  const updateNutrient = (
    key: string,
    patch: Partial<MenuItemNutritionalInformation>,
  ) => {
    const current = value.nutritionalInformation[key];
    if (!current) return;
    onChange({
      ...value,
      nutritionalInformation: {
        ...value.nutritionalInformation,
        [key]: { ...current, ...patch },
      },
    });
  };

  const renameNutrientKey = (oldKey: string, newKey: string) => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey) return;
    if (value.nutritionalInformation[trimmed]) return;

    const { [oldKey]: entry, ...rest } = value.nutritionalInformation;
    if (!entry) return;

    onChange({
      ...value,
      nutritionalInformation: {
        ...rest,
        [trimmed]: entry,
      },
    });
  };

  const removeNutrient = (key: string) => {
    const { [key]: _removed, ...rest } = value.nutritionalInformation;
    onChange({
      ...value,
      nutritionalInformation: rest,
    });
  };

  const addNutrient = () => {
    let index = nutrientEntries.length + 1;
    let key = `nutrient-${index}`;
    while (value.nutritionalInformation[key]) {
      index += 1;
      key = `nutrient-${index}`;
    }

    onChange({
      ...value,
      nutritionalInformation: {
        ...value.nutritionalInformation,
        [key]: emptyMenuItemNutritionalInformation(),
      },
    });
  };

  return (
    <div className="space-y-6 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Ingredients &amp; product info</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Structured ingredient data stored as JSON in the menu table.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setImportError(null);
            setImportOpen(true);
          }}
        >
          <FileJson className="mr-1 h-4 w-4" />
          Import JSON
        </Button>
      </div>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import ingredients JSON</DialogTitle>
            <DialogDescription>
              Paste AI-generated JSON here. Supports a full{' '}
              <code className="text-xs">ingredients</code> object, a single{' '}
              <code className="text-xs">{'{ menuItemId, ingredients }'}</code>{' '}
              entry, or a batch array. When editing an item, the entry matching
              this menu item&apos;s ID is used.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="ingredients-import-json">JSON</Label>
            <Textarea
              id="ingredients-import-json"
              rows={14}
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                if (importError) setImportError(null);
              }}
              placeholder='[{"menuItemId": 1, "ingredients": { ... }}]'
              className="field-sizing-fixed max-h-[90vh] overflow-y-auto resize-y font-mono text-xs"
            />
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!importText.trim()}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ing-contents">Contents</Label>
          <Textarea
            id="ing-contents"
            rows={4}
            value={value.contents}
            disabled={disabled}
            onChange={(e) =>
              onChange(updateTextField(value, 'contents', e.target.value))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-food-history">Food history</Label>
          <Textarea
            id="ing-food-history"
            rows={4}
            value={value.foodHistory}
            disabled={disabled}
            onChange={(e) =>
              onChange(updateTextField(value, 'foodHistory', e.target.value))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-allergens">Allergens</Label>
          <Textarea
            id="ing-allergens"
            rows={3}
            value={value.allergens}
            disabled={disabled}
            onChange={(e) =>
              onChange(updateTextField(value, 'allergens', e.target.value))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-storage">Storage instructions</Label>
          <Textarea
            id="ing-storage"
            rows={3}
            value={value.storageInstructions}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                updateTextField(value, 'storageInstructions', e.target.value),
              )
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-preparation">Preparation instructions</Label>
          <Textarea
            id="ing-preparation"
            rows={3}
            value={value.preparationInstructions}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                updateTextField(value, 'preparationInstructions', e.target.value),
              )
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-cooking">Cooking instructions</Label>
          <Textarea
            id="ing-cooking"
            rows={3}
            value={value.cookingInstructions}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                updateTextField(value, 'cookingInstructions', e.target.value),
              )
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-serving">Serving instructions</Label>
          <Textarea
            id="ing-serving"
            rows={3}
            value={value.servingInstructions}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                updateTextField(value, 'servingInstructions', e.target.value),
              )
            }
          />
        </div>
      </div>
          
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ing-serving-size">Serving size</Label>
          <Input
            id="ing-serving-size"
            value={value.servingSize}
            disabled={disabled}
            onChange={(e) =>
              onChange(updateTextField(value, 'servingSize', e.target.value))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ing-portion-size">Portion size</Label>
          <Input
            id="ing-portion-size"
            value={value.portionSize}
            disabled={disabled}
            onChange={(e) =>
              onChange(updateTextField(value, 'portionSize', e.target.value))
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Nutritional information</h4>
            <p className="text-xs text-muted-foreground">
              Add one row per nutrient (e.g. energy, protein, fat).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addNutrient}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add nutrient
          </Button>
        </div>

        {nutrientEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center">
            No nutritional rows yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[36rem]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left text-xs font-semibold w-[8rem]">
                    Key
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">
                    Label
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold w-[7rem]">
                    Per serving
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold w-[7rem]">
                    Per portion
                  </th>
                  <th className="px-2 py-2 w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {nutrientEntries.map(([key, nutrient]) => (
                  <tr key={key} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        id={`nutrient-key-${key}`}
                        defaultValue={key}
                        key={key}
                        disabled={disabled}
                        onBlur={(e) => renameNutrientKey(key, e.target.value)}
                        placeholder="energy"
                        className="h-8 text-xs"
                        aria-label={`Key for ${key}`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        id={`nutrient-label-${key}`}
                        value={nutrient.label}
                        disabled={disabled}
                        onChange={(e) =>
                          updateNutrient(key, { label: e.target.value })
                        }
                        className="h-8 text-xs"
                        aria-label={`Label for ${key}`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        id={`nutrient-per-serving-${key}`}
                        value={nutrient.perServing}
                        disabled={disabled}
                        onChange={(e) =>
                          updateNutrient(key, { perServing: e.target.value })
                        }
                        className="h-8 text-xs"
                        aria-label={`Per serving for ${key}`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        id={`nutrient-per-portion-${key}`}
                        value={nutrient.perPortion}
                        disabled={disabled}
                        onChange={(e) =>
                          updateNutrient(key, { perPortion: e.target.value })
                        }
                        className="h-8 text-xs"
                        aria-label={`Per portion for ${key}`}
                      />
                    </td>
                    <td className="px-1 py-1.5 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={disabled}
                        aria-label={`Remove ${key}`}
                        onClick={() => removeNutrient(key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
