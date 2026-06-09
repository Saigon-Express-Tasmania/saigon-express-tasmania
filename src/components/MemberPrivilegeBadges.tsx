import type { BusinessType } from "@/types/UserProfile";

const MEMBER_PRIVILEGE_BADGES: {
  value: Exclude<BusinessType, "personal">;
  label: string;
  className: string;
}[] = [
  {
    value: "wholesale",
    label: "Wholesale",
    className: "bg-green-500/20 text-green-400 border-green-500/35",
  },
  {
    value: "warehouse",
    label: "Warehouse",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/35",
  },
  {
    value: "franchise",
    label: "Franchise",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/35",
  },
];

type MemberPrivilegeBadgesProps = {
  privileges: BusinessType[];
  className?: string;
};

export default function MemberPrivilegeBadges({
  privileges,
  className = "",
}: MemberPrivilegeBadgesProps) {
  const activeBadges = MEMBER_PRIVILEGE_BADGES.filter((badge) =>
    privileges.includes(badge.value),
  );

  if (activeBadges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()}>
      {activeBadges.map((badge) => (
        <span
          key={badge.value}
          className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
