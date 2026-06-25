export type ResourcesHubFolderId =
  | "inbox"
  | "starred"
  | `category-${number}`
  | `folder-${number}`
  | "sops"
  | "recipes"
  | "events"
  | "hq";

const STATIC_FOLDER_IDS = new Set<ResourcesHubFolderId>([
  "inbox",
  "starred",
  "sops",
  "recipes",
  "events",
  "hq",
]);

export type ResourcesHubHashState = {
  folder: ResourcesHubFolderId | null;
  documentId: number | null;
};

export function parseResourcesHubHash(hash: string): ResourcesHubHashState {
  const raw = (hash.startsWith("#") ? hash.slice(1) : hash).trim();
  if (!raw) return { folder: null, documentId: null };

  const withDocument = raw.match(/^category-(\d+)\/document-(\d+)$/);
  if (withDocument) {
    const categoryId = Number.parseInt(withDocument[1], 10);
    const documentId = Number.parseInt(withDocument[2], 10);
    if (!Number.isNaN(categoryId) && !Number.isNaN(documentId)) {
      return {
        folder: `category-${categoryId}`,
        documentId,
      };
    }
  }

  const folderWithDocument = raw.match(/^folder-(\d+)\/document-(\d+)$/);
  if (folderWithDocument) {
    const folderId = Number.parseInt(folderWithDocument[1], 10);
    const documentId = Number.parseInt(folderWithDocument[2], 10);
    if (!Number.isNaN(folderId) && !Number.isNaN(documentId)) {
      return {
        folder: `folder-${folderId}`,
        documentId,
      };
    }
  }

  const inboxWithDocument = raw.match(/^inbox\/document-(\d+)$/);
  if (inboxWithDocument) {
    const documentId = Number.parseInt(inboxWithDocument[1], 10);
    if (!Number.isNaN(documentId)) {
      return { folder: "inbox", documentId };
    }
  }

  const starredWithDocument = raw.match(/^starred\/document-(\d+)$/);
  if (starredWithDocument) {
    const documentId = Number.parseInt(starredWithDocument[1], 10);
    if (!Number.isNaN(documentId)) {
      return { folder: "starred", documentId };
    }
  }

  const categoryOnly = raw.match(/^category-(\d+)$/);
  if (categoryOnly) {
    const categoryId = Number.parseInt(categoryOnly[1], 10);
    if (!Number.isNaN(categoryId)) {
      return { folder: `category-${categoryId}`, documentId: null };
    }
  }

  const folderOnly = raw.match(/^folder-(\d+)$/);
  if (folderOnly) {
    const folderId = Number.parseInt(folderOnly[1], 10);
    if (!Number.isNaN(folderId)) {
      return { folder: `folder-${folderId}`, documentId: null };
    }
  }

  if (STATIC_FOLDER_IDS.has(raw as ResourcesHubFolderId)) {
    return { folder: raw as ResourcesHubFolderId, documentId: null };
  }

  return { folder: null, documentId: null };
}

export function buildResourcesHubHash(
  folder: ResourcesHubFolderId,
  documentId: number | null,
): string {
  if (documentId != null && folder === "starred") {
    return `#starred/document-${documentId}`;
  }
  if (documentId != null && folder === "inbox") {
    return `#inbox/document-${documentId}`;
  }
  if (documentId != null && folder.startsWith("category-")) {
    return `#${folder}/document-${documentId}`;
  }
  if (documentId != null && folder.startsWith("folder-")) {
    return `#${folder}/document-${documentId}`;
  }
  return `#${folder}`;
}

export function updateResourcesHubHash(
  folder: ResourcesHubFolderId,
  documentId: number | null,
): void {
  if (typeof window === "undefined") return;
  const nextHash = buildResourcesHubHash(folder, documentId);
  if (window.location.hash === nextHash) return;
  const url = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(window.history.state, "", url);
}

export function readResourcesHubHash(): ResourcesHubHashState {
  if (typeof window === "undefined") {
    return { folder: null, documentId: null };
  }
  return parseResourcesHubHash(window.location.hash);
}
