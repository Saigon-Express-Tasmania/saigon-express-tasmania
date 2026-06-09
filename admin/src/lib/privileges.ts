import type { BusinessType, PartnerBusinessType } from '@/types/UserProfile';

const BUSINESS_TYPES: BusinessType[] = [
  'personal',
  'wholesale',
  'warehouse',
  'franchise',
];

export function parsePrivileges(value: unknown): BusinessType[] {
  if (!Array.isArray(value)) {
    return ['personal'];
  }

  const privileges = value.filter(
    (item): item is BusinessType =>
      typeof item === 'string' &&
      BUSINESS_TYPES.includes(item as BusinessType),
  );

  return privileges.length > 0 ? privileges : ['personal'];
}

export function hasPrivilege(
  privileges: BusinessType[],
  required: BusinessType,
): boolean {
  return privileges.includes(required);
}

export function hasPartnerPrivilege(
  privileges: BusinessType[],
  businessType: PartnerBusinessType,
): boolean {
  return hasPrivilege(privileges, businessType);
}

export function mergePrivileges(
  current: BusinessType[],
  grant: BusinessType,
): BusinessType[] {
  return [...new Set([...current, grant])].sort();
}

export function revokePrivilege(
  current: BusinessType[],
  revoke: BusinessType,
): BusinessType[] {
  const next = current.filter((privilege) => privilege !== revoke);
  return next.length > 0 ? next : ['personal'];
}

export const PORTAL_PARTNER_PRIVILEGES = [
  'wholesale',
  'warehouse',
  'franchise',
] as const satisfies readonly BusinessType[];

export type PortalPartnerPrivilege = (typeof PORTAL_PARTNER_PRIVILEGES)[number];

export function hasAnyPortalPartnerPrivilege(privileges: BusinessType[]): boolean {
  return PORTAL_PARTNER_PRIVILEGES.some((privilege) =>
    privileges.includes(privilege),
  );
}

export function formatPortalPartnerPrivileges(privileges: BusinessType[]): string {
  const labels = PORTAL_PARTNER_PRIVILEGES.filter((privilege) =>
    privileges.includes(privilege),
  );
  return labels.length > 0 ? labels.join(', ') : '—';
}
