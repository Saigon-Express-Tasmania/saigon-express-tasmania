export type SiteCategory = {
  id: number;
  kind: string;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[];
  style: string | null;
  icon: string | null;
  customizationIds: number[];
};
