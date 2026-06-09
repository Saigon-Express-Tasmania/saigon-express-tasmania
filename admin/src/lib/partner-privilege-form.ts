import { hasAnyPortalPartnerPrivilege } from '@/lib/privileges';
import type { BusinessType } from '@/types/UserProfile';

export const PARTNER_PRIVILEGE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'franchise', label: 'Franchise' },
];

export function normalizePartnerPrivileges(privileges: BusinessType[]): BusinessType[] {
  const unique = [...new Set(privileges)];
  return unique.length > 0 ? unique.sort() : ['personal'];
}

export function togglePartnerPrivilege(
  current: BusinessType[],
  privilege: BusinessType,
): BusinessType[] {
  if (current.includes(privilege)) {
    if (privilege === 'personal' && current.length === 1) return current;
    const next = current.filter((value) => value !== privilege);
    return normalizePartnerPrivileges(next);
  }
  return normalizePartnerPrivileges([...current, privilege]);
}

export function defaultConfirmPrivileges(current: BusinessType[]): BusinessType[] {
  const base = normalizePartnerPrivileges(current);
  if (hasAnyPortalPartnerPrivilege(base)) return base;
  return normalizePartnerPrivileges([...base]);
}
