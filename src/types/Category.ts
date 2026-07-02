export type SiteCategory = {
  id: number;
  kind: string;
  categoryGroupId: number | null;
  sortOrder: number;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[];
  style: string | null;
  icon: string | null;
  customizationIds: number[];
};
