"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import { MEMBER_PORTAL_LIGHT_BANNER_CLASS } from "@/lib/member-portal-surfaces";
import { cn } from "@/lib/utils";
import {
  parseResourcesHubHash,
  readResourcesHubHash,
  updateResourcesHubHash,
} from "@/lib/franchise-resources-hub-hash";
import { supabase } from "@/lib/supabase/client";
import { useSupabase } from "@/hooks/useSupabase";
import { hasPrivilege } from "@/lib/privileges";
import type { UserProfile } from "@/types";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Library,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import FranchiseResourceContent from "@/components/franchise-resources/FranchiseResourceContent";
import FranchiseResourceDocumentBottomBar from "@/components/franchise-resources/FranchiseResourceDocumentBottomBar";
import { FranchiseResourceDocumentViewerProvider } from "@/components/franchise-resources/FranchiseResourceDocumentViewerContext";
import {
  getFileNameFromStoragePath,
  getResourcePreviewText,
  isPaginatedDocumentStoragePath,
  normalizeAttachedFiles,
  type FranchiseResourceContentData,
} from "@/types/franchise-resources";
import { toast } from "sonner";

type FolderId =
  | "inbox"
  | "starred"
  | `category-${number}`
  | `folder-${number}`
  | "sops"
  | "recipes"
  | "events"
  | "hq";

type TaxonomyCategory = {
  id: number;
  label: string;
  alias: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
};

function categoryFolderId(id: number): FolderId {
  return `category-${id}`;
}

function announcementFolderId(id: number): FolderId {
  return `folder-${id}`;
}

function folderLabel(
  folder: FolderId,
  categories: TaxonomyCategory[],
  announcementFolders: TaxonomyCategory[],
): string {
  if (folder === "inbox") return "All Announcements";
  if (folder === "starred") return "Starred";
  if (folder.startsWith("folder-")) {
    const folderId = Number.parseInt(folder.slice("folder-".length), 10);
    return (
      announcementFolders.find((row) => row.id === folderId)?.label ?? "Folder"
    );
  }
  if (folder.startsWith("category-")) {
    const categoryId = Number.parseInt(folder.slice("category-".length), 10);
    return (
      categories.find((category) => category.id === categoryId)?.label ??
      "Category"
    );
  }
  return folder;
}

type ReadFilter = "all" | "read" | "unread";

type TabId = "primary" | "updates" | "announcements";

type MemberResourceStatus = "not_seen" | "seen" | "completed";

type FranchiseResourceMemberState = {
  status: MemberResourceStatus;
  first_seen_at: string | null;
  last_seen_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  acknowledged_at: string | null;
  is_favourite: boolean;
};

type PendingFavouriteUpdate = {
  is_favourite: boolean;
  persistAs: "insert" | "update";
};

const FAVOURITE_DEBOUNCE_MS = 400;

const EMPTY_MEMBER_STATE: FranchiseResourceMemberState = {
  status: "not_seen",
  first_seen_at: null,
  last_seen_at: null,
  completed_at: null,
  progress_percent: 0,
  acknowledged_at: null,
  is_favourite: false,
};

type FranchiseDocumentRow = {
  id: number;
  title: string;
  slug: string;
  author_name: string | null;
  summary: string | null;
  description: string | null;
  is_featured: boolean;
  is_mandatory: boolean;
  requires_acknowledgement: boolean;
  published_at: string | null;
  created_at: string;
  member_state: FranchiseResourceMemberState | null;
};

type FranchiseDocumentDetail = FranchiseDocumentRow & FranchiseResourceContentData;

type HubListItem = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  date: string;
  dateHighlight?: boolean;
  unread?: boolean;
  starred?: boolean;
  memberStatus?: MemberResourceStatus;
  progressPercent?: number;
};

type ResourceMessage = HubListItem & {
  folder: FolderId;
  tab: TabId;
};

const READ_FILTER_OPTIONS: {
  id: ReadFilter;
  label: string;
  activeClass: string;
  inactiveClass: string;
  countClass: string;
}[] = [
  {
    id: "all",
    label: "All",
    activeClass:
      "bg-foreground text-background shadow-md shadow-foreground/15",
    inactiveClass: "hover:bg-secondary hover:text-foreground",
    countClass: "bg-background/20 text-inherit",
  },
  {
    id: "read",
    label: "Read",
    activeClass:
      "bg-accent text-accent-foreground shadow-md shadow-accent/25",
    inactiveClass: "hover:bg-accent/15 hover:text-accent-foreground",
    countClass: "bg-accent-foreground/15 text-inherit",
  },
  {
    id: "unread",
    label: "Unread",
    activeClass:
      "bg-primary text-primary-foreground shadow-md shadow-primary/25",
    inactiveClass: "hover:bg-primary/10 hover:text-primary",
    countClass: "bg-primary-foreground/20 text-inherit",
  },
];

const RESOURCE_MESSAGES: ResourceMessage[] = [
  {
    id: "1",
    sender: "Franchise HQ",
    subject: "GAMI Team Building — Oct 12",
    preview:
      "Save the date for our franchise team building event. Location: Swirii Rovena. RSVP by Oct 5.",
    date: "23 Jun",
    dateHighlight: true,
    unread: true,
    folder: "events",
    tab: "primary",
    starred: true,
  },
  {
    id: "2",
    sender: "Operations Team",
    subject: "Standard Operating Procedure v1.1",
    preview:
      "Updated SOP documents are now available. Please review and acknowledge by end of month.",
    date: "23 Jun",
    unread: true,
    folder: "sops",
    tab: "updates",
  },
  {
    id: "3",
    sender: "Menu Academy",
    subject: "Root Vietnamese-inspired recipe",
    preview:
      "Highlights: Vietnamese inspired food carts. View the full recipe and plating guide.",
    date: "18 Jun",
    folder: "recipes",
    tab: "primary",
  },
  {
    id: "4",
    sender: "Operations Team",
    subject: "Operation Manual 3 — v1.1",
    preview:
      "Operational support document updated with new health and safety checklists.",
    date: "16 Jun",
    folder: "sops",
    tab: "updates",
  },
  {
    id: "5",
    sender: "CSR Committee",
    subject: "Corporate Social Responsibility update",
    preview:
      "Corporate Social Responsibility is on our community's support and for connected partners.",
    date: "16 Jun",
    folder: "inbox",
    tab: "announcements",
  },
  {
    id: "6",
    sender: "Franchise HQ",
    subject: "[Action Required] Q1 menu rollout materials",
    preview:
      "New menu assets and training materials are ready. Complete Menu Academy modules before launch.",
    date: "10 Jun",
    folder: "inbox",
    tab: "updates",
  },
  {
    id: "7",
    sender: "Franchise HQ",
    subject: "Terms of service update",
    preview:
      "We are updating some terms of service related to account security for franchise partners.",
    date: "9 Jun",
    folder: "inbox",
    tab: "announcements",
  },
  {
    id: "8",
    sender: "HQ Internal",
    subject: "Restricted resources — Budget sheets",
    preview:
      "Sensitive contacts, budget sheets, and internal HQ documents. Restricted access only.",
    date: "5 Jun",
    folder: "hq",
    tab: "primary",
  },
  {
    id: "9",
    sender: "Operations Team",
    subject: "Company Title document v1.0",
    preview: "Standard franchise company title documentation now available for download.",
    date: "3 Jun",
    folder: "sops",
    tab: "primary",
  },
  {
    id: "10",
    sender: "Menu Academy",
    subject: "Crispy roast pork banh mi — recipe card",
    preview:
      "Full recipe with prep times, portion sizes, and quality checkpoints for store teams.",
    date: "1 Jun",
    folder: "recipes",
    tab: "primary",
  },
  {
    id: "11",
    sender: "Franchise HQ",
    subject: "Wholesale counter best practices",
    preview:
      "Photo guide and checklist for wholesale restaurant counter presentation standards.",
    date: "28 May",
    folder: "inbox",
    tab: "primary",
  },
  {
    id: "12",
    sender: "Operations Team",
    subject: "Operation Manual 1 & 2",
    preview:
      "Initial operational manuals uploaded. Download and share with your store managers.",
    date: "25 May",
    folder: "sops",
    tab: "primary",
  },
];

const PAGE_SIZE = 50;

function parseCategoryId(folder: FolderId): number | null {
  if (!folder.startsWith("category-")) return null;
  const id = Number.parseInt(folder.slice("category-".length), 10);
  return Number.isNaN(id) ? null : id;
}

function parseAnnouncementFolderId(folder: FolderId): number | null {
  if (!folder.startsWith("folder-")) return null;
  const id = Number.parseInt(folder.slice("folder-".length), 10);
  return Number.isNaN(id) ? null : id;
}

function canOpenResourceFromFolder(folder: FolderId): boolean {
  return (
    folder === "starred" ||
    folder === "inbox" ||
    parseCategoryId(folder) != null ||
    parseAnnouncementFolderId(folder) != null
  );
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function normalizeMemberState(
  value: FranchiseResourceMemberState | FranchiseResourceMemberState[] | null | undefined,
): FranchiseResourceMemberState | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function isDocumentUnread(
  row: FranchiseDocumentRow,
  memberState: FranchiseResourceMemberState | null,
): boolean {
  const status = memberState?.status ?? "not_seen";
  if (status === "not_seen") return true;
  if (row.is_mandatory && status !== "completed") return true;
  if (row.requires_acknowledgement && !memberState?.acknowledged_at) return true;
  return false;
}

function normalizeDocumentRow(raw: Record<string, unknown>): FranchiseDocumentRow {
  const memberState = normalizeMemberState(
    raw.member_state as
      | FranchiseResourceMemberState
      | FranchiseResourceMemberState[]
      | null
      | undefined,
  );

  return {
    id: raw.id as number,
    title: raw.title as string,
    slug: raw.slug as string,
    author_name: (raw.author_name as string | null) ?? null,
    summary: (raw.summary as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    is_featured: Boolean(raw.is_featured),
    is_mandatory: Boolean(raw.is_mandatory),
    requires_acknowledgement: Boolean(raw.requires_acknowledgement),
    published_at: (raw.published_at as string | null) ?? null,
    created_at: raw.created_at as string,
    member_state: memberState,
  };
}

function mapDocumentToListItem(row: FranchiseDocumentRow): HubListItem {
  const memberState = row.member_state;
  const status = memberState?.status ?? "not_seen";

  return {
    id: String(row.id),
    sender: row.author_name?.trim() || "Franchise HQ",
    subject: row.title,
    preview: getResourcePreviewText(row.summary, row.description),
    date: formatShortDate(row.published_at ?? row.created_at),
    dateHighlight: row.is_featured,
    unread: isDocumentUnread(row, memberState),
    starred: memberState?.is_favourite ?? false,
    memberStatus: status,
    progressPercent: memberState?.progress_percent ?? 0,
  };
}

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function FolderButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground hover:bg-secondary"
      }`}
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            active
              ? "bg-primary-foreground text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-4 py-2.5 text-left text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function ReadFilterToggle({
  value,
  onChange,
  counts,
}: {
  value: ReadFilter;
  onChange: (value: ReadFilter) => void;
  counts: Record<ReadFilter, number>;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-sm font-semibold text-foreground">Status</span>
      <div
        role="group"
        aria-label="Filter by read status"
        className="inline-flex rounded-xl border border-border bg-gradient-to-r from-secondary via-card to-primary/5 p-1 shadow-sm"
      >
        {READ_FILTER_OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                active
                  ? option.activeClass
                  : cn("text-muted-foreground", option.inactiveClass),
              )}
            >
              {option.label}
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                  active
                    ? option.countClass
                    : "bg-muted text-muted-foreground",
                )}
              >
                {counts[option.id]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function matchesFolder(
  message: ResourceMessage,
  folder: FolderId,
  starred: Set<string>,
) {
  if (folder === "inbox") return true;
  if (folder === "starred") return starred.has(message.id) || message.starred;
  if (folder.startsWith("category-")) return false;
  return message.folder === folder;
}

function normalizeDocumentDetail(
  raw: Record<string, unknown>,
): FranchiseDocumentDetail {
  const base = normalizeDocumentRow(raw);

  return {
    ...base,
    icon: (raw.icon as string | null) ?? null,
    content: (raw.content as string | null) ?? null,
    content_format: (raw.content_format as string | null) ?? "html",
    attached_files: normalizeAttachedFiles(raw.attached_files),
    content_file: (raw.content_file as string | null) ?? null,
    video_file: (raw.video_file as string | null) ?? null,
    thumbnail_url: (raw.thumbnail_url as string | null) ?? null,
    version: (raw.version as string | null) ?? null,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    external_url: (raw.external_url as string | null) ?? null,
    estimated_read_minutes:
      typeof raw.estimated_read_minutes === "number"
        ? raw.estimated_read_minutes
        : null,
  };
}

async function fetchAnnouncements(
  folderId: number | null,
): Promise<FranchiseDocumentRow[]> {
  let query = supabase
    .from("franchise_resources")
    .select(
      `
      id,
      title,
      slug,
      author_name,
      summary,
      description,
      is_featured,
      is_mandatory,
      requires_acknowledgement,
      published_at,
      created_at,
      member_state:franchise_resource_member_states (
        status,
        first_seen_at,
        last_seen_at,
        completed_at,
        progress_percent,
        acknowledged_at,
        is_favourite
      )
    `,
    )
    .eq("type", "announcement")
    .eq("is_published", true);

  if (folderId != null) {
    query = query.eq("category_id", folderId);
  }

  const { data, error } = await query.order("published_at", {
    ascending: false,
  });

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeDocumentRow(row as Record<string, unknown>),
  );
}

async function fetchFavouriteResources(): Promise<FranchiseDocumentRow[]> {
  const { data, error } = await supabase
    .from("franchise_resources")
    .select(
      `
      id,
      title,
      slug,
      author_name,
      summary,
      description,
      is_featured,
      is_mandatory,
      requires_acknowledgement,
      published_at,
      created_at,
      member_state:franchise_resource_member_states!inner (
        status,
        first_seen_at,
        last_seen_at,
        completed_at,
        progress_percent,
        acknowledged_at,
        is_favourite
      )
    `,
    )
    .in("type", ["announcement", "document"])
    .eq("is_published", true)
    .eq("member_state.is_favourite", true)
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeDocumentRow(row as Record<string, unknown>),
  );
}

async function fetchCategoryDocuments(
  categoryId: number,
): Promise<FranchiseDocumentRow[]> {
  const { data, error } = await supabase
    .from("franchise_resources")
    .select(
      `
      id,
      title,
      slug,
      author_name,
      summary,
      description,
      is_featured,
      is_mandatory,
      requires_acknowledgement,
      published_at,
      created_at,
      member_state:franchise_resource_member_states (
        status,
        first_seen_at,
        last_seen_at,
        completed_at,
        progress_percent,
        acknowledged_at,
        is_favourite
      )
    `,
    )
    .eq("type", "document")
    .eq("category_id", categoryId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeDocumentRow(row as Record<string, unknown>),
  );
}

async function fetchFranchiseDocumentDetail(
  resourceId: number,
): Promise<FranchiseDocumentDetail> {
  const { data, error } = await supabase
    .from("franchise_resources")
    .select(
      `
      id,
      title,
      slug,
      author_name,
      icon,
      description,
      summary,
      content,
      content_format,
      attached_files,
      content_file,
      video_file,
      thumbnail_url,
      version,
      tags,
      external_url,
      estimated_read_minutes,
      is_featured,
      is_mandatory,
      requires_acknowledgement,
      published_at,
      created_at,
      member_state:franchise_resource_member_states (
        status,
        first_seen_at,
        last_seen_at,
        completed_at,
        progress_percent,
        acknowledged_at,
        is_favourite
      )
    `,
    )
    .eq("id", resourceId)
    .in("type", ["document", "announcement"])
    .eq("is_published", true)
    .single();

  if (error) throw error;
  return normalizeDocumentDetail(data as Record<string, unknown>);
}

async function markFranchiseResourceSeen(
  userId: string,
  resourceId: number,
  memberState: FranchiseResourceMemberState | null,
): Promise<"seen" | "unchanged"> {
  const now = new Date().toISOString();

  if (memberState?.status === "completed") {
    const { error } = await supabase
      .from("franchise_resource_member_states")
      .update({ last_seen_at: now })
      .eq("resource_id", resourceId)
      .eq("user_id", userId);
    if (error) throw error;
    return "unchanged";
  }

  if (memberState) {
    const { error } = await supabase
      .from("franchise_resource_member_states")
      .update({
        status: "seen",
        last_seen_at: now,
      })
      .eq("resource_id", resourceId)
      .eq("user_id", userId);
    if (error) throw error;
    return memberState.status === "not_seen" ? "seen" : "unchanged";
  }

  const { error } = await supabase
    .from("franchise_resource_member_states")
    .insert({
      resource_id: resourceId,
      user_id: userId,
      status: "seen",
      last_seen_at: now,
      is_favourite: false,
    });
  if (error) throw error;
  return "seen";
}

async function markFranchiseResourceUnread(
  userId: string,
  resourceId: number,
  memberState: FranchiseResourceMemberState | null,
): Promise<"unread" | "unchanged"> {
  if (!memberState || memberState.status === "not_seen") {
    return "unchanged";
  }

  const { error } = await supabase
    .from("franchise_resource_member_states")
    .update({ status: "not_seen" })
    .eq("resource_id", resourceId)
    .eq("user_id", userId);
  if (error) throw error;
  return "unread";
}

function applyMemberStateToDocument<T extends FranchiseDocumentRow>(
  doc: T,
  memberState: FranchiseResourceMemberState,
): T {
  return { ...doc, member_state: memberState };
}

function buildSeenMemberState(
  memberState: FranchiseResourceMemberState | null,
  now: string,
): FranchiseResourceMemberState {
  return {
    ...(memberState ?? EMPTY_MEMBER_STATE),
    status: "seen",
    first_seen_at: memberState?.first_seen_at ?? now,
    last_seen_at: now,
    progress_percent: Math.max(memberState?.progress_percent ?? 0, 1),
  };
}

function buildUnreadMemberState(
  memberState: FranchiseResourceMemberState | null,
): FranchiseResourceMemberState {
  return {
    ...(memberState ?? EMPTY_MEMBER_STATE),
    status: "not_seen",
    first_seen_at: null,
    last_seen_at: null,
    completed_at: null,
    acknowledged_at: null,
    progress_percent: 0,
  };
}

async function flushFavouriteUpdates(
  userId: string,
  pending: Map<number, PendingFavouriteUpdate>,
): Promise<void> {
  if (pending.size === 0) return;

  const inserts: {
    resource_id: number;
    user_id: string;
    is_favourite: boolean;
    status: "not_seen";
  }[] = [];
  const updates: { resource_id: number; is_favourite: boolean }[] = [];

  for (const [resourceId, entry] of pending) {
    if (entry.persistAs === "insert") {
      inserts.push({
        resource_id: resourceId,
        user_id: userId,
        is_favourite: entry.is_favourite,
        status: "not_seen",
      });
    } else {
      updates.push({ resource_id: resourceId, is_favourite: entry.is_favourite });
    }
  }

  const operations = [
    ...updates.map((row) =>
      supabase
        .from("franchise_resource_member_states")
        .update({ is_favourite: row.is_favourite })
        .eq("resource_id", row.resource_id)
        .eq("user_id", userId),
    ),
    ...(inserts.length > 0
      ? [
          supabase
            .from("franchise_resource_member_states")
            .insert(inserts),
        ]
      : []),
  ];

  const results = await Promise.all(operations);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }
}

export default function FranchiseResourcesHub() {
  const router = useRouter();
  const { user, profile, authMetadata, isLoading, isSignedIn, signOut } =
    useSupabase();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<FolderId>("inbox");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [starredIds, setStarredIds] = useState<Set<string>>(
    () => new Set(RESOURCE_MESSAGES.filter((m) => m.starred).map((m) => m.id)),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [announcementFolders, setAnnouncementFolders] = useState<TaxonomyCategory[]>(
    [],
  );
  const [announcementFoldersLoading, setAnnouncementFoldersLoading] =
    useState(false);
  const [announcementCounts, setAnnouncementCounts] = useState<{
    total: number;
    byFolderId: Map<number, number>;
  }>({ total: 0, byFolderId: new Map() });
  const [documents, setDocuments] = useState<FranchiseDocumentRow[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [selectedDocument, setSelectedDocument] =
    useState<FranchiseDocumentDetail | null>(null);
  const [selectedDocumentLoading, setSelectedDocumentLoading] = useState(false);
  const [readStatusUpdating, setReadStatusUpdating] = useState(false);
  const [bulkReadStatusUpdating, setBulkReadStatusUpdating] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const documentsRef = useRef(documents);
  documentsRef.current = documents;
  const userRef = useRef(user);
  userRef.current = user;
  const pendingFavouritesRef = useRef(new Map<number, PendingFavouriteUpdate>());
  const favouriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFolderRef = useRef(activeFolder);
  activeFolderRef.current = activeFolder;
  const hashRestoreDocumentIdRef = useRef<number | null>(null);
  const hashInitializedRef = useRef(false);

  const hasFranchise = hasPrivilege(authMetadata.privileges, "franchise");
  const activeCategoryId = useMemo(
    () => parseCategoryId(activeFolder),
    [activeFolder],
  );
  const activeAnnouncementFolderId = useMemo(
    () => parseAnnouncementFolderId(activeFolder),
    [activeFolder],
  );
  const isAnnouncementInboxView = activeFolder === "inbox";
  const isAnnouncementFolderView = activeAnnouncementFolderId != null;
  const isAnnouncementView = isAnnouncementInboxView || isAnnouncementFolderView;
  const isCategoryView = activeCategoryId != null;
  const isStarredView = activeFolder === "starred";
  const isDatabaseListView =
    isCategoryView || isStarredView || isAnnouncementView;

  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getContactName(profile),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const searchFilteredMessages = useMemo((): HubListItem[] => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch = (item: HubListItem) => {
      if (!query) return true;
      return (
        item.sender.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.preview.toLowerCase().includes(query)
      );
    };

    if (isStarredView) {
      const dbFavourites = documents
        .filter((doc) => doc.member_state?.is_favourite)
        .map(mapDocumentToListItem)
        .filter(matchesSearch);
      const mockFavourites = RESOURCE_MESSAGES.filter(
        (message) => starredIds.has(message.id) || message.starred,
      ).filter(matchesSearch);
      return [...dbFavourites, ...mockFavourites];
    }

    if (isAnnouncementView || isCategoryView) {
      return documents.map(mapDocumentToListItem).filter(matchesSearch);
    }

    return RESOURCE_MESSAGES.filter((message) => {
      if (!matchesFolder(message, activeFolder, starredIds)) return false;
      return matchesSearch(message);
    });
  }, [
    activeFolder,
    documents,
    isAnnouncementView,
    isCategoryView,
    isStarredView,
    searchQuery,
    starredIds,
  ]);

  const readFilterCounts = useMemo(
    (): Record<ReadFilter, number> => ({
      all: searchFilteredMessages.length,
      read: searchFilteredMessages.filter((item) => !item.unread).length,
      unread: searchFilteredMessages.filter((item) => item.unread).length,
    }),
    [searchFilteredMessages],
  );

  const filteredMessages = useMemo((): HubListItem[] => {
    if (readFilter === "read") {
      return searchFilteredMessages.filter((item) => !item.unread);
    }
    if (readFilter === "unread") {
      return searchFilteredMessages.filter((item) => item.unread);
    }
    return searchFilteredMessages;
  }, [readFilter, searchFilteredMessages]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredMessages.length);
  const visibleMessages = filteredMessages.slice(pageStart, pageEnd);

  const allVisibleSelected =
    visibleMessages.length > 0 &&
    visibleMessages.every((message) => selectedIds.has(message.id));

  const activeFolderLabel = folderLabel(
    activeFolder,
    categories,
    announcementFolders,
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isSignedIn) {
      router.push("/member");
      return;
    }
    if (!hasFranchise) {
      router.push("/member/dashboard");
    }
  }, [isLoading, isSignedIn, hasFranchise, router]);

  useEffect(() => {
    if (isLoading || !isSignedIn || !hasFranchise) return;

    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from("franchise_resource_taxonomies")
          .select("id, label, alias, icon, description, sort_order")
          .eq("place", "document")
          .eq("kind", "category")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("label", { ascending: true });

        if (cancelled) return;

        if (error) throw error;
        setCategories((data ?? []) as TaxonomyCategory[]);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load categories.",
        );
        setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }

    void loadCategories();

    async function loadAnnouncementFolders() {
      setAnnouncementFoldersLoading(true);
      try {
        const [foldersResult, countsResult] = await Promise.all([
          supabase
            .from("franchise_resource_taxonomies")
            .select("id, label, alias, icon, description, sort_order")
            .eq("place", "announcement")
            .eq("kind", "folder")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("label", { ascending: true }),
          supabase
            .from("franchise_resources")
            .select("category_id")
            .eq("type", "announcement")
            .eq("is_published", true),
        ]);

        if (cancelled) return;

        if (foldersResult.error) throw foldersResult.error;
        if (countsResult.error) throw countsResult.error;

        setAnnouncementFolders((foldersResult.data ?? []) as TaxonomyCategory[]);

        const byFolderId = new Map<number, number>();
        let total = 0;
        for (const row of countsResult.data ?? []) {
          total += 1;
          const categoryId = row.category_id as number | null;
          if (categoryId == null) continue;
          byFolderId.set(categoryId, (byFolderId.get(categoryId) ?? 0) + 1);
        }
        setAnnouncementCounts({ total, byFolderId });
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load announcement folders.",
        );
        setAnnouncementFolders([]);
        setAnnouncementCounts({ total: 0, byFolderId: new Map() });
      } finally {
        if (!cancelled) setAnnouncementFoldersLoading(false);
      }
    }

    void loadAnnouncementFolders();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isSignedIn, hasFranchise]);

  const loadStarredDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      const rows = await fetchFavouriteResources();
      setDocuments(rows);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load starred resources.",
      );
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async (folderId: number | null) => {
    setDocumentsLoading(true);
    try {
      const rows = await fetchAnnouncements(folderId);
      setDocuments(rows);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load announcements.",
      );
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const loadCategoryDocuments = useCallback(async (categoryId: number) => {
    setDocumentsLoading(true);
    try {
      const rows = await fetchCategoryDocuments(categoryId);
      setDocuments(rows);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load documents.",
      );
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isSignedIn || !hasFranchise) return;

    if (isStarredView) {
      void loadStarredDocuments();
      return;
    }

    if (isAnnouncementInboxView) {
      void loadAnnouncements(null);
      return;
    }

    if (activeAnnouncementFolderId != null) {
      void loadAnnouncements(activeAnnouncementFolderId);
      return;
    }

    if (activeCategoryId == null) {
      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    void loadCategoryDocuments(activeCategoryId);
  }, [
    activeAnnouncementFolderId,
    activeCategoryId,
    hasFranchise,
    isAnnouncementInboxView,
    isLoading,
    isSignedIn,
    isStarredView,
    loadAnnouncements,
    loadCategoryDocuments,
    loadStarredDocuments,
  ]);

  useEffect(() => {
    if (hashInitializedRef.current) return;
    hashInitializedRef.current = true;

    const { folder, documentId } = readResourcesHubHash();
    if (folder) {
      setActiveFolder(folder);
    }
    if (documentId != null) {
      setSelectedDocumentId(documentId);
    }
  }, []);

  useEffect(() => {
    setPage(0);
  }, [activeFolder, readFilter, searchQuery]);

  const selectFolder = useCallback((folder: FolderId) => {
    setActiveFolder(folder);
    setSelectedDocumentId(null);
    setSelectedDocument(null);
    hashRestoreDocumentIdRef.current = null;
    updateResourcesHubHash(folder, null);
    setMobileNavOpen(false);
  }, []);

  const closeSelectedDocument = useCallback(() => {
    setSelectedDocumentId(null);
    setSelectedDocument(null);
    hashRestoreDocumentIdRef.current = null;
    updateResourcesHubHash(activeFolderRef.current, null);
  }, []);

  const openDocument = useCallback(
    async (resourceId: number, options?: { syncHash?: boolean }) => {
      const syncHash = options?.syncHash ?? true;
      const folder = activeFolderRef.current;
      if (!canOpenResourceFromFolder(folder)) return;

      setSelectedDocumentId(resourceId);
      setSelectedDocumentLoading(true);
      setSelectedDocument(null);
      if (syncHash) {
        updateResourcesHubHash(folder, resourceId);
      }

      try {
        const detail = await fetchFranchiseDocumentDetail(resourceId);
        setSelectedDocument(detail);
        hashRestoreDocumentIdRef.current = resourceId;

        const userId = userRef.current?.id;
        if (userId) {
          const memberState = detail.member_state;
          const markResult = await markFranchiseResourceSeen(
            userId,
            resourceId,
            memberState,
          );

          if (markResult === "seen") {
            setDocuments((current) =>
              current.map((doc) => {
                if (doc.id !== resourceId) return doc;
                const nextState = doc.member_state ?? {
                  ...EMPTY_MEMBER_STATE,
                };
                return {
                  ...doc,
                  member_state: {
                    ...nextState,
                    status: "seen",
                    last_seen_at: new Date().toISOString(),
                    progress_percent: Math.max(
                      nextState.progress_percent,
                      1,
                    ),
                  },
                };
              }),
            );
            setSelectedDocument((current) => {
              if (!current || current.id !== resourceId) return current;
              const nextState = current.member_state ?? {
                ...EMPTY_MEMBER_STATE,
              };
              return {
                ...current,
                member_state: {
                  ...nextState,
                  status: "seen",
                  last_seen_at: new Date().toISOString(),
                  progress_percent: Math.max(nextState.progress_percent, 1),
                },
              };
            });
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load document.",
        );
        setSelectedDocumentId(null);
        setSelectedDocument(null);
        hashRestoreDocumentIdRef.current = null;
        updateResourcesHubHash(activeFolderRef.current, null);
      } finally {
        setSelectedDocumentLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hashInitializedRef.current) return;
    if (isLoading || !isSignedIn || !hasFranchise) return;

    const { folder, documentId } = parseResourcesHubHash(window.location.hash);
    const canOpenDocument =
      documentId != null && folder != null && canOpenResourceFromFolder(folder);
    if (!canOpenDocument) return;
    if (activeFolder !== folder) return;
    if (
      hashRestoreDocumentIdRef.current === documentId &&
      selectedDocument?.id === documentId
    ) {
      return;
    }
    if (selectedDocumentLoading && selectedDocumentId === documentId) return;

    void openDocument(documentId, { syncHash: false });
  }, [
    activeFolder,
    hasFranchise,
    isLoading,
    isSignedIn,
    openDocument,
    selectedDocument?.id,
    selectedDocumentId,
    selectedDocumentLoading,
  ]);

  useEffect(() => {
    function handleHashChange() {
      const { folder, documentId } = parseResourcesHubHash(window.location.hash);
      if (folder) {
        setActiveFolder(folder);
      }

      if (documentId == null) {
        setSelectedDocumentId(null);
        setSelectedDocument(null);
        hashRestoreDocumentIdRef.current = null;
        return;
      }

      if (!folder || !canOpenResourceFromFolder(folder)) return;

      hashRestoreDocumentIdRef.current = null;
      void openDocument(documentId, { syncHash: false });
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [openDocument]);

  const scheduleFavouriteFlush = useCallback(() => {
    if (favouriteTimerRef.current) {
      clearTimeout(favouriteTimerRef.current);
    }

    favouriteTimerRef.current = setTimeout(() => {
      favouriteTimerRef.current = null;
      const userId = userRef.current?.id;
      if (!userId) return;

      const pending = new Map(pendingFavouritesRef.current);
      pendingFavouritesRef.current.clear();
      if (pending.size === 0) return;

      void flushFavouriteUpdates(userId, pending).catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to save favourites.",
        );
      });
    }, FAVOURITE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (favouriteTimerRef.current) {
        clearTimeout(favouriteTimerRef.current);
        favouriteTimerRef.current = null;
      }

      const userId = userRef.current?.id;
      const pending = pendingFavouritesRef.current;
      if (userId && pending.size > 0) {
        const snapshot = new Map(pending);
        pending.clear();
        void flushFavouriteUpdates(userId, snapshot);
      }
    };
  }, []);

  const getDocumentFavourite = useCallback(
    (resourceId: number): boolean => {
      const pending = pendingFavouritesRef.current.get(resourceId);
      if (pending != null) return pending.is_favourite;

      const doc = documentsRef.current.find((row) => row.id === resourceId);
      return doc?.member_state?.is_favourite ?? false;
    },
    [],
  );

  const applyFavouriteOptimistic = useCallback(
    (resourceIds: number[], isFavourite: boolean) => {
      setDocuments((current) => {
        const next = current.map((doc) => {
          if (!resourceIds.includes(doc.id)) return doc;

          const memberState = doc.member_state ?? {
            ...EMPTY_MEMBER_STATE,
          };

          return {
            ...doc,
            member_state: { ...memberState, is_favourite: isFavourite },
          };
        });

        if (activeFolderRef.current === "starred" && !isFavourite) {
          return next.filter((doc) => doc.member_state?.is_favourite ?? false);
        }

        return next;
      });

      for (const resourceId of resourceIds) {
        const existing = pendingFavouritesRef.current.get(resourceId);
        const doc = documentsRef.current.find((row) => row.id === resourceId);
        const persistAs: PendingFavouriteUpdate["persistAs"] =
          existing?.persistAs ??
          (doc?.member_state ? "update" : "insert");

        pendingFavouritesRef.current.set(resourceId, {
          is_favourite: isFavourite,
          persistAs,
        });
      }

      scheduleFavouriteFlush();
    },
    [scheduleFavouriteFlush],
  );

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const selectedDocumentUnread = useMemo(() => {
    if (!selectedDocument) return false;
    return isDocumentUnread(selectedDocument, selectedDocument.member_state);
  }, [selectedDocument]);

  const toggleDocumentReadStatus = useCallback(async () => {
    const userId = userRef.current?.id;
    const doc = selectedDocument;
    if (!userId || !doc || readStatusUpdating) return;

    const memberState = doc.member_state;
    const unread = isDocumentUnread(doc, memberState);
    setReadStatusUpdating(true);

    try {
      if (unread) {
        const result = await markFranchiseResourceSeen(
          userId,
          doc.id,
          memberState,
        );
        if (result === "seen") {
          const nextState = buildSeenMemberState(
            memberState,
            new Date().toISOString(),
          );
          setSelectedDocument((current) =>
            current?.id === doc.id
              ? applyMemberStateToDocument(current, nextState)
              : current,
          );
          setDocuments((current) =>
            current.map((row) =>
              row.id === doc.id
                ? applyMemberStateToDocument(row, nextState)
                : row,
            ),
          );
        }
      } else {
        const result = await markFranchiseResourceUnread(
          userId,
          doc.id,
          memberState,
        );
        if (result === "unread") {
          const nextState = buildUnreadMemberState(memberState);
          setSelectedDocument((current) =>
            current?.id === doc.id
              ? applyMemberStateToDocument(current, nextState)
              : current,
          );
          setDocuments((current) =>
            current.map((row) =>
              row.id === doc.id
                ? applyMemberStateToDocument(row, nextState)
                : row,
            ),
          );
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update read status.",
      );
    } finally {
      setReadStatusUpdating(false);
    }
  }, [readStatusUpdating, selectedDocument]);

  const selectedResourceIds = useMemo(
    () =>
      Array.from(selectedIds)
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => !Number.isNaN(id)),
    [selectedIds],
  );

  const hasBulkSelection = selectedResourceIds.length > 0;

  const applyBulkMemberStateUpdates = useCallback(
    (updates: Map<number, FranchiseResourceMemberState>) => {
      if (updates.size === 0) return;

      setDocuments((current) =>
        current.map((doc) => {
          const nextState = updates.get(doc.id);
          return nextState ? applyMemberStateToDocument(doc, nextState) : doc;
        }),
      );
      setSelectedDocument((current) => {
        if (!current) return current;
        const nextState = updates.get(current.id);
        return nextState ? applyMemberStateToDocument(current, nextState) : current;
      });
    },
    [],
  );

  const bulkMarkAsRead = useCallback(async () => {
    const userId = userRef.current?.id;
    if (!userId || bulkReadStatusUpdating || selectedResourceIds.length === 0) {
      return;
    }

    setBulkReadStatusUpdating(true);
    try {
      const now = new Date().toISOString();
      const updates = new Map<number, FranchiseResourceMemberState>();

      await Promise.all(
        selectedResourceIds.map(async (resourceId) => {
          const doc = documentsRef.current.find((row) => row.id === resourceId);
          const memberState = doc?.member_state ?? null;
          const result = await markFranchiseResourceSeen(
            userId,
            resourceId,
            memberState,
          );
          if (result === "seen") {
            updates.set(resourceId, buildSeenMemberState(memberState, now));
          }
        }),
      );

      applyBulkMemberStateUpdates(updates);
      if (updates.size > 0) {
        toast.success(
          `Marked ${updates.size} document${updates.size === 1 ? "" : "s"} as read.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark documents as read.",
      );
    } finally {
      setBulkReadStatusUpdating(false);
    }
  }, [
    applyBulkMemberStateUpdates,
    bulkReadStatusUpdating,
    selectedResourceIds,
  ]);

  const bulkMarkAsUnread = useCallback(async () => {
    const userId = userRef.current?.id;
    if (!userId || bulkReadStatusUpdating || selectedResourceIds.length === 0) {
      return;
    }

    setBulkReadStatusUpdating(true);
    try {
      const updates = new Map<number, FranchiseResourceMemberState>();

      await Promise.all(
        selectedResourceIds.map(async (resourceId) => {
          const doc = documentsRef.current.find((row) => row.id === resourceId);
          const memberState = doc?.member_state ?? null;
          const result = await markFranchiseResourceUnread(
            userId,
            resourceId,
            memberState,
          );
          if (result === "unread") {
            updates.set(resourceId, buildUnreadMemberState(memberState));
          }
        }),
      );

      applyBulkMemberStateUpdates(updates);
      if (updates.size > 0) {
        toast.success(
          `Marked ${updates.size} document${updates.size === 1 ? "" : "s"} as unread.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to mark documents as unread.",
      );
    } finally {
      setBulkReadStatusUpdating(false);
    }
  }, [
    applyBulkMemberStateUpdates,
    bulkReadStatusUpdating,
    selectedResourceIds,
  ]);

  const toggleStar = (clickedId: string) => {
    if (isDatabaseListView) {
      const userId = userRef.current?.id;
      if (!userId) {
        toast.error("Sign in to save favourites.");
        return;
      }

      const targetIds =
        selectedIds.size > 0 ? Array.from(selectedIds) : [clickedId];
      const targetResourceIds = targetIds
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => !Number.isNaN(id));

      if (targetResourceIds.length === 0) {
        if (!isStarredView) return;

        setStarredIds((current) => {
          const next = new Set(current);
          for (const id of targetIds) {
            if (next.has(id)) next.delete(id);
            else next.add(id);
          }
          return next;
        });
        return;
      }

      const allFavourited = targetResourceIds.every((resourceId) =>
        getDocumentFavourite(resourceId),
      );
      const nextFavourite = !allFavourited;

      applyFavouriteOptimistic(targetResourceIds, nextFavourite);
      return;
    }

    setStarredIds((current) => {
      const next = new Set(current);
      if (next.has(clickedId)) next.delete(clickedId);
      else next.add(clickedId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleMessages.map((message) => message.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isDocumentView = selectedDocumentId != null && isDatabaseListView;

  useEffect(() => {
    if (isDocumentView) {
      setMobileNavOpen(false);
    }
  }, [isDocumentView]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileNavOpen]);

  if (isLoading || !isSignedIn || !profile || !me || !hasFranchise) {
    return (
      <MemberPortalBackground
        variant="light"
        className="flex items-center justify-center"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </MemberPortalBackground>
    );
  }

  return (
    <FranchiseResourceDocumentViewerProvider>
      <MemberPortalBackground variant="light">
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
        theme="light"
      />

      <div className={cn(`py-6 ${MEMBER_PORTAL_LIGHT_BANNER_CLASS}`, isDocumentView && "max-sm:hidden")}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Library className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">
                Resources Hub
              </h1>
              <p className="text-sm text-muted-foreground">
                Franchise documents, recipes, and operational resources
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          `border-b border-border bg-card`,
          isDocumentView && "max-sm:hidden",
        )}
      >
        <div className="container flex items-center justify-between py-4">
          <div className="text-base">
            {!isDocumentView ? (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="group text-left transition-colors lg:hidden"
                aria-expanded={mobileNavOpen}
                aria-controls="resources-hub-sidebar"
                aria-label="Open folders"
              >
                <span className="text-amber-600 underline underline-offset-2 group-hover:text-primary/80">
                  Resources
                </span>
                <span className="mx-1.5 text-primary/40">/</span>
                <span className="font-semibold text-primary underline underline-offset-2 group-hover:text-primary/80">
                  {activeFolderLabel}
                </span>
              </button>
            ) : null}
            <div
              className={cn(
                "text-muted-foreground",
                !isDocumentView && "max-lg:hidden",
              )}
            >
              <span>Resources</span>
              <span className="mx-1.5 text-border">/</span>
              <span className="font-semibold text-foreground">
                {activeFolderLabel}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => selectFolder("starred")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isStarredView && "border-primary bg-primary/10 text-primary",
              )}
              aria-label="Starred resources"
              aria-pressed={isStarredView}
            >
              <Star
                className={cn("h-4 w-4", isStarredView && "fill-current")}
              />
            </button>
          </div>
        </div>
      </div>

      {!isDocumentView && !mobileNavOpen ? (
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="fixed left-0 top-[calc(env(safe-area-inset-top)+9.25rem)] z-[45] flex h-14 w-10 items-center justify-center rounded-r-xl border border-l-0 border-primary/90 bg-primary pl-0.5 text-primary-foreground shadow-[4px_2px_16px_-4px_rgba(0,0,0,0.22)] transition-[width,background-color] hover:w-11 hover:bg-primary/90 lg:hidden"
          aria-expanded={mobileNavOpen}
          aria-controls="resources-hub-sidebar"
          aria-label="Open folders"
        >
          <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2.25} />
        </button>
      ) : null}

      <div
        className={cn(
          "container max-w-[1600px] py-5",
          isDocumentView
            ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-28"
            : "pb-16",
          isDocumentView && "max-sm:py-3",
        )}
      >
        <div className="relative flex flex-col gap-6 lg:flex-row">
          {mobileNavOpen ? (
            <button
              type="button"
              aria-label="Close folder navigation"
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px] transition-opacity lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          ) : null}

          <aside
            id="resources-hub-sidebar"
            className={cn(
              "shrink-0 lg:relative lg:z-auto lg:block lg:w-[250px] lg:translate-x-0 lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none",
              "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:w-[min(100%,280px)] max-lg:flex-col max-lg:overflow-y-auto max-lg:border-r max-lg:border-border max-lg:bg-card max-lg:p-4 max-lg:shadow-2xl max-lg:transition-transform max-lg:duration-300 max-lg:ease-out",
              mobileNavOpen
                ? "max-lg:translate-x-0"
                : "max-lg:pointer-events-none max-lg:-translate-x-full",
              isDocumentView && "max-lg:hidden",
            )}
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3 lg:hidden">
              <span className="text-sm font-semibold text-foreground">
                Folders
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close folders"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-6">
              <div className="label-badge mb-2.5">Announcements</div>
              <div className="flex flex-col gap-1.5">
                {announcementFoldersLoading ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading folders…
                  </div>
                ) : (
                  <>
                    <FolderButton
                      label="All Announcements"
                      count={announcementCounts.total}
                      active={activeFolder === "inbox"}
                      onClick={() => selectFolder("inbox")}
                    />
                    {announcementFolders.length === 0 ? (
                      <p className="px-4 py-2 text-sm text-muted-foreground">
                        No folders yet.
                      </p>
                    ) : (
                      announcementFolders.map((folder) => (
                        <FolderButton
                          key={folder.id}
                          label={folder.label}
                          count={announcementCounts.byFolderId.get(folder.id) ?? 0}
                          active={
                            activeFolder === announcementFolderId(folder.id)
                          }
                          onClick={() =>
                            selectFolder(announcementFolderId(folder.id))
                          }
                        />
                      ))
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="label-badge mb-2.5">Categories</div>
              <div className="flex flex-col gap-1.5">
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories…
                  </div>
                ) : categories.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-muted-foreground">
                    No categories yet.
                  </p>
                ) : (
                  categories.map((category) => (
                    <CategoryButton
                      key={category.id}
                      label={category.label}
                      active={activeFolder === categoryFolderId(category.id)}
                      onClick={() => selectFolder(categoryFolderId(category.id))}
                    />
                  ))
                )}
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {!isDocumentView ? (
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full max-w-md">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search resources..."
                  className="flex-1 rounded-l border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
                />
                <button
                  type="button"
                  className="rounded-r bg-primary px-4 py-2.5 text-primary-foreground transition-colors hover:bg-primary/90"
                  aria-label="Search resources"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              <ReadFilterToggle
                value={readFilter}
                onChange={setReadFilter}
                counts={readFilterCounts}
              />
            </div>
            ) : null}

            <div
              className={cn(
                "overflow-hidden rounded-lg border border-border bg-card shadow-sm",
                isDocumentView &&
                  "flex min-h-0 flex-col max-sm:min-h-[calc(100dvh-9.5rem)] max-sm:max-h-[calc(100dvh-9.5rem)]",
              )}
            >
              {!isDocumentView ? (
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 cursor-pointer"
                    aria-label="Select all"
                  />
                  <button
                    type="button"
                    disabled={!isDatabaseListView || documentsLoading}
                    onClick={() => {
                      if (isStarredView) {
                        void loadStarredDocuments();
                        return;
                      }
                      if (isAnnouncementInboxView) {
                        void loadAnnouncements(null);
                        return;
                      }
                      if (activeAnnouncementFolderId != null) {
                        void loadAnnouncements(activeAnnouncementFolderId);
                        return;
                      }
                      if (activeCategoryId != null) {
                        void loadCategoryDocuments(activeCategoryId);
                      }
                    }}
                    className="transition-colors hover:text-foreground disabled:opacity-40"
                    aria-label="Refresh"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${documentsLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    className="transition-colors hover:text-foreground"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {hasBulkSelection && isDatabaseListView ? (
                    <>
                      <div
                        className="h-4 w-px shrink-0 bg-border"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => void bulkMarkAsRead()}
                        disabled={bulkReadStatusUpdating}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                      >
                        {bulkReadStatusUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Mark as Read
                      </button>
                      <button
                        type="button"
                        onClick={() => void bulkMarkAsUnread()}
                        disabled={bulkReadStatusUpdating}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                      >
                        Mark as Unread
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {filteredMessages.length === 0
                      ? "0 of 0"
                      : `${pageStart + 1}-${pageEnd} of ${filteredMessages.length}`}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    className="disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages - 1, current + 1))
                    }
                    className="disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              ) : null}

              {isDocumentView ? (
                <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-6 sm:py-6">
                  <button
                    type="button"
                    onClick={closeSelectedDocument}
                    className="mb-3 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:mb-5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to resources
                  </button>
                  {selectedDocumentLoading || !selectedDocument ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-16 text-sm text-muted-foreground">
                      <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                      Loading resource…
                    </div>
                  ) : (
                    <FranchiseResourceContent
                      resource={selectedDocument}
                      layout="hub"
                      className="min-h-0 flex-1"
                      titleAction={
                        <button
                          type="button"
                          onClick={() => void toggleDocumentReadStatus()}
                          disabled={readStatusUpdating}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60 sm:px-3 sm:text-sm"
                        >
                          {readStatusUpdating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {selectedDocumentUnread
                            ? "Mark as Read"
                            : "Mark as Unread"}
                        </button>
                      }
                    />
                  )}
                </div>
              ) : documentsLoading && isDatabaseListView ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-sm text-muted-foreground">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                  {isStarredView
                    ? "Loading starred resources…"
                    : isAnnouncementView
                      ? "Loading announcements…"
                      : "Loading documents…"}
                </div>
              ) : visibleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-sm text-muted-foreground">
                  <FolderOpen className="mb-3 h-10 w-10 opacity-30" />
                  {searchFilteredMessages.length === 0
                    ? isStarredView
                      ? "No starred announcements or documents yet."
                      : isAnnouncementFolderView
                        ? "No published announcements in this folder."
                        : isAnnouncementInboxView
                          ? "No published announcements yet."
                          : isCategoryView
                            ? "No published documents in this category."
                            : "No resources match your current filters."
                    : readFilter === "read"
                      ? isAnnouncementView
                        ? "No read announcements match your current filters."
                        : "No read documents match your current filters."
                      : readFilter === "unread"
                        ? isAnnouncementView
                          ? "No unread announcements match your current filters."
                          : "No unread documents match your current filters."
                        : "No resources match your current filters."}
                </div>
              ) : (
                <div>
                  {visibleMessages.map((message) => {
                    const isStarred = isDatabaseListView
                      ? message.starred ?? false
                      : starredIds.has(message.id) || message.starred;
                    const isSelected = selectedIds.has(message.id);
                    return (
                      <div
                        key={message.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isDatabaseListView) {
                            const resourceId = Number.parseInt(message.id, 10);
                            if (!Number.isNaN(resourceId)) {
                              void openDocument(resourceId);
                            }
                            return;
                          }
                          toggleSelect(message.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (isDatabaseListView) {
                              const resourceId = Number.parseInt(message.id, 10);
                              if (!Number.isNaN(resourceId)) {
                                void openDocument(resourceId);
                              }
                              return;
                            }
                            toggleSelect(message.id);
                          }
                        }}
                        className={`flex cursor-pointer items-center border-b border-border px-4 py-2.5 text-sm last:border-b-0 transition-colors hover:bg-secondary/60 ${
                          message.unread ? "bg-secondary/40 font-semibold" : ""
                        } ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex min-w-[52px] shrink-0 items-center gap-2.5 text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(message.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="cursor-pointer"
                            aria-label={`Select ${message.subject}`}
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleStar(message.id);
                            }}
                            className={`transition-colors ${
                              isStarred ? "text-amber-500" : "hover:text-amber-500"
                            }`}
                            aria-label={isStarred ? "Unstar" : "Star"}
                          >
                            <Star
                              className={`h-4 w-4 ${isStarred ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>

                        <div
                          className={`hidden w-[160px] shrink-0 truncate pr-3 sm:block ${
                            message.unread ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {message.sender}
                        </div>

                        <div className="min-w-0 flex-1 pr-4">
                          <div className="truncate">
                            <span className="text-foreground sm:hidden">
                              {message.sender}:{" "}
                            </span>
                            <span
                              className={
                                message.unread
                                  ? "text-foreground"
                                  : "font-medium text-foreground"
                              }
                            >
                              {message.subject}
                            </span>
                            {message.preview ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                — {message.preview}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className={`w-[56px] shrink-0 text-right text-xs ${
                            message.dateHighlight
                              ? "font-semibold text-emerald-700"
                              : "text-muted-foreground"
                          }`}
                        >
                          {message.date}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isDocumentView && selectedDocument ? (
        <FranchiseResourceDocumentBottomBar
          documentTitle={selectedDocument.title}
          contentFile={selectedDocument.content_file}
          fileName={
            selectedDocument.content_file?.trim()
              ? getFileNameFromStoragePath(selectedDocument.content_file)
              : null
          }
          showPagination={isPaginatedDocumentStoragePath(
            selectedDocument.content_file ?? "",
          )}
          showZoom={Boolean(selectedDocument.content_file?.trim())}
        />
      ) : null}
    </MemberPortalBackground>
    </FranchiseResourceDocumentViewerProvider>
  );
}
