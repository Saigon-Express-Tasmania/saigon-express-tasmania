type NavLinkItem = { href: string; key: string };
type NavDropdownItem = { key: string; items: readonly NavLinkItem[] };

export type NavItem = NavLinkItem | NavDropdownItem;

export function isNavDropdown(item: NavItem): item is NavDropdownItem {
  return "items" in item;
}

export const NAV_LINKS = [
  { href: "/menu", key: "our_food" },
  { href: "/catering", key: "catering" },
  { href: "/wholesale", key: "wholesale" },
  {
    key: "community",
    items: [
      { href: "/our-story", key: "our_story" },
      { href: "/news", key: "news" },
      { href: "/faq", key: "faq" },
    ],
  },
  { href: "/careers", key: "careers" },
  { href: "/franchise", key: "franchise" },
  { href: "/stores", key: "find_us" },
] as const satisfies readonly NavItem[];

export const PORTAL_LINKS = [
  { id: "wholesale", href: "/member/dashboard", icon: "📦" },
] as const;
