export const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/menu", key: "our_food" },
  { href: "/our-story", key: "our_story" },
  { href: "/wholesale", key: "wholesale" },
  { href: "/franchise", key: "franchise" },
  { href: "/faq", key: "faq" },
] as const;

export const PORTAL_LINKS = [
  { id: "franchise", href: "/franchise/dashboard", icon: "🏪" },
  { id: "wholesale", href: "/wholesale/shop", icon: "📦" },
  { id: "warehouse", href: "/member/dashboard", icon: "🏭" },
] as const;
