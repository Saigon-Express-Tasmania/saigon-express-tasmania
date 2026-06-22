import { FOOD_CONTENT_LABEL_VISIBILITY } from "@/config/settings";
import {
  FOOD_CONTENT_FIELD_ORDER,
  parseFoodContent,
  type FoodContent,
} from "@/types/FoodContent";

export type FoodContentVisibilityGroupId = Exclude<
  (typeof FOOD_CONTENT_LABEL_VISIBILITY)[keyof FoodContent],
  false
>;

export function getVisibleFoodContentLabelIds(
  value: FoodContent | unknown,
): FoodContentVisibilityGroupId[] {
  const parsed = parseFoodContent(value);
  const seen = new Set<string>();
  const labels: FoodContentVisibilityGroupId[] = [];

  for (const key of FOOD_CONTENT_FIELD_ORDER) {
    const groupId = FOOD_CONTENT_LABEL_VISIBILITY[key];
    if (!groupId) continue;
    if (!parsed[key]) continue;
    if (seen.has(groupId)) continue;
    seen.add(groupId);
    labels.push(groupId);
  }

  return labels;
}
