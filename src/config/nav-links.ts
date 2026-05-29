export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Our Food' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/wholesale-shop', label: 'Wholesale Shop' },
  { href: '/franchise', label: 'Franchise' },
  { href: '/faq', label: 'FAQ' },
] as const;

export const PORTAL_LINKS = [
  { href: '/portals/franchise', label: 'Franchise Portal', icon: '🏪' },
  { href: '/portals/wholesale', label: 'Wholesale Portal', icon: '📦' },
  { href: '/portals/warehouse', label: 'Warehouse Portal', icon: '🏭' },
] as const;
