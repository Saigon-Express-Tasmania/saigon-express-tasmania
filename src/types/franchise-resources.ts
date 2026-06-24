export type FranchiseResourceContentFormat = "html" | "markdown" | "plain";

export type FranchiseResourceAttachedFile = {
  name: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
};

export type FranchiseResourceContentData = {
  title: string;
  icon?: string | null;
  description?: string | null;
  summary?: string | null;
  author_name?: string | null;
  content?: string | null;
  content_format?: FranchiseResourceContentFormat | string;
  content_file?: string | null;
  video_file?: string | null;
  attached_files?: FranchiseResourceAttachedFile[];
  thumbnail_url?: string | null;
  version?: string | null;
  tags?: string[];
  external_url?: string | null;
  estimated_read_minutes?: number | null;
  published_at?: string | null;
  created_at?: string | null;
};

export function normalizeAttachedFiles(
  value: unknown,
): FranchiseResourceAttachedFile[] {
  if (!Array.isArray(value)) return [];
  const files: FranchiseResourceAttachedFile[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!name || !url) continue;
    files.push({
      name,
      url,
      mime_type:
        typeof row.mime_type === "string" ? row.mime_type : undefined,
      size_bytes:
        typeof row.size_bytes === "number" ? row.size_bytes : undefined,
    });
  }
  return files;
}

export function getResourcePreviewText(
  summary: string | null | undefined,
  description: string | null | undefined,
): string {
  const summaryText = summary?.trim();
  if (summaryText) return summaryText;
  const descriptionText = description?.trim();
  if (descriptionText) return descriptionText;
  return "";
}
