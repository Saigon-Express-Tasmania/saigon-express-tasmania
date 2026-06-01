export const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/menu", key: "our_food" },
  { href: "/our-story", key: "our_story" },
  { href: "/wholesale-shop", key: "wholesale" },
  { href: "/franchise", key: "franchise" },
  { href: "/faq", key: "faq" },
] as const;

export const PORTAL_LINKS = [
  { id: "franchise", href: "/portals/franchise", icon: "🏪" },
  { id: "wholesale", href: "/portals/wholesale", icon: "📦" },
  { id: "warehouse", href: "/portals/warehouse", icon: "🏭" },
] as const;
