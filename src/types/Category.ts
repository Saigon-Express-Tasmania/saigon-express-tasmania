export type SiteCategory = {
  id: number;
  alias: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  addon: string[];
};
