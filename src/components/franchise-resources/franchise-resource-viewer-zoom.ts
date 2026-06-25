export const FRANCHISE_RESOURCE_VIEWER_ZOOM_MIN = 0.5;
export const FRANCHISE_RESOURCE_VIEWER_ZOOM_MAX = 2.5;
export const FRANCHISE_RESOURCE_VIEWER_ZOOM_STEP = 0.25;

export function clampFranchiseResourceViewerZoom(scale: number): number {
  return Math.min(
    FRANCHISE_RESOURCE_VIEWER_ZOOM_MAX,
    Math.max(
      FRANCHISE_RESOURCE_VIEWER_ZOOM_MIN,
      Math.round(scale * 100) / 100,
    ),
  );
}

export function formatFranchiseResourceViewerZoom(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
