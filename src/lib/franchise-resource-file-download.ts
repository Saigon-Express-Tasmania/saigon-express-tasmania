export async function downloadFranchiseResourceFile(
  url: string,
  fileName: string,
): Promise<void> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return;

  const safeName = fileName.trim() || "download";

  try {
    const response = await fetch(trimmedUrl);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = safeName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = trimmedUrl;
    anchor.download = safeName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
