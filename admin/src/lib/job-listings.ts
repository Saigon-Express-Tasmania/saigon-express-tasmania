export const JOB_LISTING_SELECT =
  'id, title, department, employment_type, location, salary, badge, badge_color, summary, responsibilities, requirements, perks, is_active, sort_order, store_id, created_at, updated_at';

export function formatJobListingDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function jobListingActiveBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
    : 'bg-muted text-muted-foreground hover:bg-muted';
}
