import type { BusinessType } from "@/types/UserProfile";

const BUSINESS_TYPES: BusinessType[] = [
  "personal",
  "wholesale",
  "warehouse",
  "franchise",
];

export function parsePrivileges(value: unknown): BusinessType[] {
  if (!Array.isArray(value)) {
    return ["personal"];
  }

  const privileges = value.filter(
    (item): item is BusinessType =>
      typeof item === "string" &&
      BUSINESS_TYPES.includes(item as BusinessType),
  );

  return privileges.length > 0 ? privileges : ["personal"];
}

export function hasPrivilege(
  privileges: BusinessType[],
  required: BusinessType,
): boolean {
  return privileges.includes(required);
}

export function hasPortalPrivilege(privileges: BusinessType[]): boolean {
  return hasPrivilege(privileges, "wholesale") || hasPrivilege(privileges, "warehouse");
}

export function mergePrivileges(
  current: BusinessType[],
  grant: BusinessType,
): BusinessType[] {
  return [...new Set([...current, grant])].sort();
}

export function resolvePortalType(
  privileges: BusinessType[],
): Extract<BusinessType, "wholesale" | "warehouse"> {
  if (hasPrivilege(privileges, "warehouse")) return "warehouse";
  return "wholesale";
}
