export const MEMBER_PORTAL_BACKGROUNDS = [
  "/manus-storage/news-team-behind_03530abb.jpg",
  "/manus-storage/wholesale-restaurant-counter_2d79d665.jpg",
  "/manus-storage/store_kingston_391b29d4.jpg",
  "/manus-storage/store_glebehill_c588aacd.png",
  "/manus-storage/_Q7A0084addedcontrastandsat_4c8d6b63.jpg",
] as const;

const MEMBER_PORTAL_BG_STORAGE_KEY = "member-portal-background";

export function pickRandomMemberPortalBackground(): string {
  const index = Math.floor(Math.random() * MEMBER_PORTAL_BACKGROUNDS.length);
  return MEMBER_PORTAL_BACKGROUNDS[index];
}

/** One random background per browser tab session; reused across member portal pages. */
export function resolveMemberPortalBackground(): string {
  const stored = sessionStorage.getItem(MEMBER_PORTAL_BG_STORAGE_KEY);
  if (
    stored &&
    (MEMBER_PORTAL_BACKGROUNDS as readonly string[]).includes(stored)
  ) {
    return stored;
  }

  const picked = pickRandomMemberPortalBackground();
  sessionStorage.setItem(MEMBER_PORTAL_BG_STORAGE_KEY, picked);
  return picked;
}
