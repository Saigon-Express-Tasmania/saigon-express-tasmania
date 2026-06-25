"use client";

import Link from "@/components/link";
import {
  buildResourcesHubHash,
  type ResourcesHubFolderId,
} from "@/lib/franchise-resources-hub-hash";
import { supabase } from "@/lib/supabase/client";
import { getResourcePreviewText } from "@/types/franchise-resources";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatAnnouncementEventDate } from "./franchise-announcements";

type AnnouncementFolder = {
  id: number;
  label: string;
};

type AnnouncementRow = {
  id: number;
  title: string;
  summary: string | null;
  description: string | null;
  published_at: string | null;
  created_at: string;
  category_id: number | null;
};

type ActiveFolder = number | null;

const DASHBOARD_ANNOUNCEMENT_LIMIT = 3;
const RESOURCES_HUB_PATH = "/member/resources-hub";

function resourcesHubFolderHref(folderId: number | null): string {
  const folder: ResourcesHubFolderId =
    folderId != null ? `folder-${folderId}` : "inbox";
  return `${RESOURCES_HUB_PATH}${buildResourcesHubHash(folder, null)}`;
}

function resourcesHubAnnouncementHref(
  announcementId: number,
  categoryId: number | null,
): string {
  const folder: ResourcesHubFolderId =
    categoryId != null ? `folder-${categoryId}` : "inbox";
  return `${RESOURCES_HUB_PATH}${buildResourcesHubHash(folder, announcementId)}`;
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
          ? "bg-[#a82e2e] text-white"
          : "border border-[#e5e5e5] bg-white text-[#555] hover:bg-[#f3f3f3]"
      }`}
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            active ? "bg-white text-[#a82e2e]" : "bg-[#f3f3f3] text-[#555]"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function AnnouncementCard({ announcement }: { announcement: AnnouncementRow }) {
  const eventDate = announcement.published_at ?? announcement.created_at;
  const { day, month } = formatAnnouncementEventDate(eventDate);
  const body = getResourcePreviewText(
    announcement.summary,
    announcement.description,
  );
  const href = resourcesHubAnnouncementHref(
    announcement.id,
    announcement.category_id,
  );

  return (
    <Link
      href={href}
      className="flex flex-1 flex-col rounded-xl border border-[#e5e5e5] p-6 no-underline transition-colors hover:border-[#d0d0d0]"
    >
      <div className="mb-4 flex items-start gap-4">
        <div className="shrink-0 text-center leading-none text-[#a82e2e]">
          <div className="text-[32px] font-bold">{day}</div>
          <div className="mt-0.5 text-sm">{month}</div>
        </div>
        <h3 className="m-0 text-lg font-bold text-black">{announcement.title}</h3>
      </div>
      <p className="m-0 text-sm leading-relaxed text-[#555]">{body}</p>
    </Link>
  );
}

export default function FranchiseAnnouncementsSection() {
  const [announcementFolders, setAnnouncementFolders] = useState<
    AnnouncementFolder[]
  >([]);
  const [announcementFoldersLoading, setAnnouncementFoldersLoading] =
    useState(true);
  const [announcementCounts, setAnnouncementCounts] = useState<
    Map<number, number>
  >(new Map());
  const [activeFolder, setActiveFolder] = useState<ActiveFolder>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncementFolders() {
      setAnnouncementFoldersLoading(true);
      try {
        const [foldersResult, countsResult] = await Promise.all([
          supabase
            .from("franchise_resource_taxonomies")
            .select("id, label")
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

        setAnnouncementFolders((foldersResult.data ?? []) as AnnouncementFolder[]);

        const byFolderId = new Map<number, number>();
        for (const row of countsResult.data ?? []) {
          const categoryId = row.category_id as number | null;
          if (categoryId == null) continue;
          byFolderId.set(categoryId, (byFolderId.get(categoryId) ?? 0) + 1);
        }
        setAnnouncementCounts(byFolderId);

        const folders = (foldersResult.data ?? []) as AnnouncementFolder[];
        if (folders.length > 0) {
          setActiveFolder((current) => current ?? folders[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to load announcement folders.",
        );
        setAnnouncementFolders([]);
        setAnnouncementCounts(new Map());
      } finally {
        if (!cancelled) setAnnouncementFoldersLoading(false);
      }
    }

    void loadAnnouncementFolders();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadAnnouncements = useCallback(async (folderId: number | null) => {
    setAnnouncementsLoading(true);
    try {
      let query = supabase
        .from("franchise_resources")
        .select(
          "id, title, summary, description, published_at, created_at, category_id",
        )
        .eq("type", "announcement")
        .eq("is_published", true);

      if (folderId != null) {
        query = query.eq("category_id", folderId);
      }

      const { data, error } = await query
        .order("published_at", { ascending: false })
        .limit(DASHBOARD_ANNOUNCEMENT_LIMIT);

      if (error) throw error;
      setAnnouncements((data ?? []) as AnnouncementRow[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load announcements.",
      );
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (announcementFoldersLoading) return;
    void loadAnnouncements(activeFolder);
  }, [activeFolder, announcementFoldersLoading, loadAnnouncements]);

  return (
    <section className="relative rounded-[20px] bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.05)] sm:p-10">
      <div
        className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-sm bg-[#e0e0e0]"
        aria-hidden
      />

      <div className="mb-6 mt-2 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <h2 className="font-serif text-[32px] font-normal text-[#111]">
          Announcements
        </h2>
        <Link
          href={resourcesHubFolderHref(activeFolder)}
          className="text-sm font-semibold text-[#a82e2e] no-underline transition-colors hover:text-[#8a2525]"
        >
          View all
        </Link>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-[250px]">
          <div className="label-badge mb-2.5">Announcements</div>
          <div className="flex flex-col gap-1.5">
            {announcementFoldersLoading ? (
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#555]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading folders…
              </div>
            ) : announcementFolders.length === 0 ? (
              <p className="px-4 py-2 text-sm text-[#555]">No folders yet.</p>
            ) : (
              announcementFolders.map((folder) => (
                <FolderButton
                  key={folder.id}
                  label={folder.label}
                  count={announcementCounts.get(folder.id) ?? 0}
                  active={activeFolder === folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                />
              ))
            )}
          </div>
        </aside>

        {announcementsLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-[#555]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading announcements…
          </div>
        ) : announcements.length === 0 ? (
          <p className="flex flex-1 items-center py-10 text-sm text-[#555]">
            {activeFolder == null
              ? "No published announcements yet."
              : "No published announcements in this folder."}
          </p>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
