import type { MenuItem } from "@/contexts/CartContext";
import type { CateringPack } from "@/lib/supabase/catering-packs";

export function cateringPackToCustomiseItem(
  pack: CateringPack,
  unitPrice: number,
): MenuItem {
  return {
    id: pack.id,
    name: pack.name,
    category: pack.category,
    price: unitPrice.toFixed(2),
    description: pack.description,
    imageUrl: pack.img,
    isAvailable: pack.isAvailable,
    energy: 0,
    customizationIds: pack.customizationIds,
    customizationsDisabled: pack.customizationsDisabled,
  };
}
