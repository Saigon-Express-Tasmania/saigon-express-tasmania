/** Row shape from `public.job_listings` (snake_case). */
export type JobListingRow = {
  id: number;
  title: string;
  department: string;
  employment_type: string;
  location: string;
  salary: string;
  badge: string | null;
  badge_color: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  perks: string[];
  is_active: boolean;
  sort_order: number;
  store_id: number | null;
  created_at: string;
  updated_at: string;
};

/** Job listing used by careers UI components. */
export type JobListing = {
  id: number;
  title: string;
  department: string;
  type: string;
  location: string;
  salary: string;
  badge: string | null;
  badgeColor: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  perks: string[];
  isActive: boolean;
  sortOrder: number;
  storeId: number | null;
  createdAt: string;
  updatedAt: string;
};

export function mapJobListingRow(row: JobListingRow): JobListing {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    type: row.employment_type,
    location: row.location,
    salary: row.salary,
    badge: row.badge,
    badgeColor: row.badge_color,
    summary: row.summary,
    responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [],
    perks: row.perks ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order,
    storeId: row.store_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
