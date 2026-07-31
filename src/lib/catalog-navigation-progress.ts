export const CATALOG_NAVIGATION_START_EVENT = "catalog-navigation-start";

export function dispatchCatalogNavigationStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CATALOG_NAVIGATION_START_EVENT));
}
