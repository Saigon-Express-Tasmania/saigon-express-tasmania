export const JOB_APPLICATION_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const JOB_APPLICATION_ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const JOB_APPLICATION_FILE_INPUT_ACCEPT =
  "image/jpeg,image/jpg,image/png,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isJobApplicationFileAllowed(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime && JOB_APPLICATION_ACCEPTED_MIME_TYPES.has(mime)) {
    return true;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "pdf" || ext === "doc" || ext === "docx" || ext === "jpg" || ext === "jpeg" || ext === "png";
}

export function formatJobApplicationFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
