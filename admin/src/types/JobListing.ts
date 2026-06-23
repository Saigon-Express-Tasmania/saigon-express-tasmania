export type JobListing = {
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

export type JobListingInput = Omit<
  JobListing,
  'id' | 'created_at' | 'updated_at'
>;

export const emptyJobListingInput = (): JobListingInput => ({
  title: '',
  department: '',
  employment_type: '',
  location: '',
  salary: '',
  badge: null,
  badge_color: '',
  summary: '',
  responsibilities: [],
  requirements: [],
  perks: [],
  is_active: true,
  sort_order: 0,
  store_id: null,
});

export function jobListingToInput(listing: JobListing): JobListingInput {
  return {
    title: listing.title,
    department: listing.department,
    employment_type: listing.employment_type,
    location: listing.location,
    salary: listing.salary,
    badge: listing.badge,
    badge_color: listing.badge_color,
    summary: listing.summary,
    responsibilities: listing.responsibilities ?? [],
    requirements: listing.requirements ?? [],
    perks: listing.perks ?? [],
    is_active: listing.is_active,
    sort_order: listing.sort_order,
    store_id: listing.store_id,
  };
}

export function linesToTextArray(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function textArrayToLines(values: string[]): string {
  return (values ?? []).join('\n');
}
