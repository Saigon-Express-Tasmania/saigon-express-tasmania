export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Our Food' },
  { href: '/our-story', label: 'Our Story' },
  { href: '/wholesale-shop', label: 'Wholesale Shop' },
  { href: '/franchise', label: 'Franchise' },
  { href: '/faq', label: 'FAQ' },
] as const;

export const PORTAL_LINKS = [
  { id: 'franchise', href: '/portals/franchise', icon: '🏪' },
  { id: 'wholesale', href: '/portals/wholesale', icon: '📦' },
  { id: 'warehouse', href: '/portals/warehouse', icon: '🏭' },
] as const;
