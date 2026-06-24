export type FranchiseAnnouncementAudience =
  | "important"
  | "to_me"
  | "to_everyone";

export type FranchiseAnnouncement = {
  id: string;
  title: string;
  body: string;
  eventDate: string;
  audience: FranchiseAnnouncementAudience;
  href?: string;
};

export type FranchiseQuickLink = {
  label: string;
  href: string;
  active?: boolean;
};

export const FRANCHISE_ANNOUNCEMENT_GROUPS: {
  id: FranchiseAnnouncementAudience;
  label: string;
}[] = [
  { id: "important", label: "Important" },
  { id: "to_me", label: "To me" },
  { id: "to_everyone", label: "To everyone" },
];

export const DEFAULT_FRANCHISE_QUICK_LINKS: FranchiseQuickLink[] = [
  { label: "Training Modules", href: "#", active: true },
  { label: "Book a Meeting Room", href: "#" },
  { label: "My Payslips", href: "#" },
];

/** Placeholder data until admin-published announcements are wired up. */
export const PLACEHOLDER_FRANCHISE_ANNOUNCEMENTS: FranchiseAnnouncement[] = [
  {
    id: "q4-vision",
    title: "Q4 Vision and Strategy",
    body: "Our leadership lays out the new quarter vision. Watch the live stream.",
    eventDate: "2025-10-18",
    audience: "to_everyone",
  },
  {
    id: "sydney-cbd-opening",
    title: "New Store Opening: Sydney CBD",
    body: "Expanding! Meet our new team members.",
    eventDate: "2025-10-21",
    audience: "important",
  },
  {
    id: "employee-spotlight-david",
    title: "Employee Spotlight: David's Tenure",
    body: "Celebrating David's 10 years at Saigon Express! Watch his video interview.",
    eventDate: "2025-10-13",
    audience: "to_me",
  },
];

export function formatAnnouncementEventDate(eventDate: string): {
  day: string;
  month: string;
} {
  const date = new Date(`${eventDate}T12:00:00`);
  return {
    day: String(date.getDate()),
    month: date.toLocaleString("en-AU", { month: "short" }).toUpperCase(),
  };
}
