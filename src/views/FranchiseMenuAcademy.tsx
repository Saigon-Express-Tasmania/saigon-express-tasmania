"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import { MEMBER_PORTAL_LIGHT_BANNER_CLASS } from "@/lib/member-portal-surfaces";
import { supabase } from "@/lib/supabase/client";
import { useSupabase } from "@/hooks/useSupabase";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { hasPrivilege } from "@/lib/privileges";
import type { UserProfile } from "@/types";
import { resolveFranchiseResourceFileUrl } from "@/types/franchise-resources";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  GraduationCap,
  Loader2,
  PlayCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";

type CourseFilterId =
  | "all"
  | "mandatory"
  | "not_started"
  | "in_progress"
  | "completed";

type SortOption = "a-z" | "z-a" | "recent";

type AcademyTaxonomyKind = "course" | "period";

type AcademyTaxonomy = {
  id: number;
  kind: AcademyTaxonomyKind;
  label: string;
  sort_order: number;
};

type MemberResourceState = {
  status: "not_seen" | "seen" | "completed";
  progress_percent: number;
};

type MenuAcademyResourceRow = {
  id: number;
  title: string;
  category_id: number | null;
  course_id: number | null;
  period_id: number | null;
  thumbnail_url: string | null;
  is_mandatory: boolean;
  published_at: string | null;
  created_at: string;
  course_duration: string | null;
  member_state: MemberResourceState | null;
};

type MenuAcademyListItem = {
  id: number;
  title: string;
  categoryLabel: string;
  image: string;
  usesFallbackImage: boolean;
  gradient: string;
  duration: string | null;
  memberStatus: MemberResourceState["status"] | null;
};

const CARD_GRADIENTS = [
  "from-primary/10 to-card",
  "from-brand-amber/20 to-card",
  "from-primary/5 to-secondary",
  "from-brand-amber/15 to-card",
  "from-primary/8 to-brand-cream",
  "from-secondary to-card",
] as const;

const DEFAULT_COURSE_IMAGE = "/images/rounded_logo_v2.png";

type TaxonomyFilterSelection = {
  kind: AcademyTaxonomyKind;
  id: number;
} | null;

const TAXONOMY_FILTER_GROUPS: {
  kind: AcademyTaxonomyKind;
  label: string;
  allLabel: string;
}[] = [
  { kind: "course", label: "Course", allLabel: "All courses" },
  { kind: "period", label: "Period", allLabel: "All periods" },
];

function taxonomyFieldForKind(
  kind: AcademyTaxonomyKind,
): "course_id" | "period_id" {
  return kind === "course" ? "course_id" : "period_id";
}

function formatCourseDuration(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d+):(\d{2}):(\d{2})/);
  if (!match) return value.trim();
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes} min`;
  return null;
}

function isNotStartedMemberState(
  state: MemberResourceState | null | undefined,
): boolean {
  return state == null || state.status === "not_seen";
}

function normalizeMemberState(
  value: MemberResourceState | MemberResourceState[] | null | undefined,
): MemberResourceState | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function normalizeMenuAcademyRow(
  raw: Record<string, unknown>,
): MenuAcademyResourceRow {
  const memberState = normalizeMemberState(
    raw.member_state as MemberResourceState | MemberResourceState[] | null,
  );

  return {
    id: raw.id as number,
    title: raw.title as string,
    category_id: (raw.category_id as number | null) ?? null,
    course_id: (raw.course_id as number | null) ?? null,
    period_id: (raw.period_id as number | null) ?? null,
    thumbnail_url: (raw.thumbnail_url as string | null) ?? null,
    is_mandatory: Boolean(raw.is_mandatory),
    published_at: (raw.published_at as string | null) ?? null,
    created_at: raw.created_at as string,
    course_duration: (raw.course_duration as string | null) ?? null,
    member_state: memberState,
  };
}

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
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
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          active
            ? "bg-primary-foreground text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CourseStatusBadge({
  status,
}: {
  status: MemberResourceState["status"] | null;
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
        Completed
      </span>
    );
  }

  if (status === "seen") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200/70">
        <PlayCircle className="h-3 w-3 shrink-0" aria-hidden />
        In progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-inset ring-border/80">
      <Circle className="h-3 w-3 shrink-0" aria-hidden />
      Not started
    </span>
  );
}

function CourseCardFooter({ course }: { course: MenuAcademyListItem }) {
  return (
    <div className="mt-auto border-t border-border/50 pt-2.5">
      <CourseStatusBadge status={course.memberStatus} />
    </div>
  );
}

function CourseCardTile({ course }: { course: MenuAcademyListItem }) {
  return (
    <Link
      href={`/member/menu-academy/${course.id}`}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:border-primary/30 hover:shadow-md"
    >
      <div
        className={`relative h-40 w-full overflow-hidden bg-gradient-to-b ${course.gradient}`}
      >
        {course.usesFallbackImage ? (
          <Image
            src={DEFAULT_COURSE_IMAGE}
            alt="Saigon Express"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-contain p-8"
          />
        ) : (
          <AppImage
            src={course.image}
            alt=""
            fill
            className="object-cover"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="section-label mb-1 text-[11px]">
          {course.categoryLabel}
        </p>
        <h3
          className={`line-clamp-2 text-sm font-semibold leading-snug text-foreground ${
            course.duration ? "mb-2" : "mb-3"
          }`}
        >
          {course.title}
        </h3>
        {course.duration ? (
          <p className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            <span>{course.duration}</span>
          </p>
        ) : null}
        <CourseCardFooter course={course} />
      </div>
    </Link>
  );
}

export default function FranchiseMenuAcademy() {
  const router = useRouter();
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();
  const { getPublicUrl } = useSupabaseStorage();

  const [activeFilter, setActiveFilter] = useState<CourseFilterId>("all");
  const [selectedTaxonomyFilter, setSelectedTaxonomyFilter] =
    useState<TaxonomyFilterSelection>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [taxonomies, setTaxonomies] = useState<AcademyTaxonomy[]>([]);
  const [resources, setResources] = useState<MenuAcademyResourceRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const hasFranchise = hasPrivilege(authMetadata.privileges, "franchise");

  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getContactName(profile),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [taxonomyResult, resourcesResult] = await Promise.all([
        supabase
          .from("franchise_resource_taxonomies")
          .select("id, kind, label, sort_order")
          .eq("place", "academy")
          .in("kind", ["course", "period"])
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("label", { ascending: true }),
        supabase
          .from("franchise_resources")
          .select(
            `
            id,
            title,
            category_id,
            course_id,
            period_id,
            thumbnail_url,
            course_duration,
            is_mandatory,
            published_at,
            created_at,
            member_state:franchise_resource_member_states (
              status,
              progress_percent
            )
          `,
          )
          .eq("type", "menu_training")
          .eq("is_published", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

      if (taxonomyResult.error) throw taxonomyResult.error;
      if (resourcesResult.error) throw resourcesResult.error;

      setTaxonomies((taxonomyResult.data ?? []) as AcademyTaxonomy[]);
      setResources(
        (resourcesResult.data ?? []).map((row) =>
          normalizeMenuAcademyRow(row as Record<string, unknown>),
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load menu academy.",
      );
      setTaxonomies([]);
      setResources([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isSignedIn) {
      router.push("/member");
      return;
    }
    if (!hasFranchise) {
      router.push("/member/dashboard");
      return;
    }
    void loadCatalog();
  }, [hasFranchise, isLoading, isSignedIn, loadCatalog, router]);

  const taxonomyLabelById = useMemo(
    () => new Map(taxonomies.map((row) => [row.id, row.label])),
    [taxonomies],
  );

  const taxonomiesByKind = useMemo(
    () => ({
      course: taxonomies.filter((row) => row.kind === "course"),
      period: taxonomies.filter((row) => row.kind === "period"),
    }),
    [taxonomies],
  );

  const taxonomyCounts = useMemo(() => {
    const countById = (kind: AcademyTaxonomyKind, taxonomyId: number) => {
      const field = taxonomyFieldForKind(kind);
      return resources.filter((row) => row[field] === taxonomyId).length;
    };

    return {
      course: new Map(
        taxonomiesByKind.course.map((row) => [
          row.id,
          countById("course", row.id),
        ]),
      ),
      period: new Map(
        taxonomiesByKind.period.map((row) => [
          row.id,
          countById("period", row.id),
        ]),
      ),
    };
  }, [resources, taxonomiesByKind]);

  const courseFilters = useMemo((): {
    id: CourseFilterId;
    label: string;
    count: number;
  }[] => {
    const mandatoryCount = resources.filter((row) => row.is_mandatory).length;
    const notStartedCount = resources.filter((row) =>
      isNotStartedMemberState(row.member_state),
    ).length;
    const inProgressCount = resources.filter(
      (row) => row.member_state?.status === "seen",
    ).length;
    const completedCount = resources.filter(
      (row) => row.member_state?.status === "completed",
    ).length;

    return [
      { id: "all", label: "All Courses", count: resources.length },
      { id: "mandatory", label: "Mandatory", count: mandatoryCount },
      { id: "not_started", label: "Not started", count: notStartedCount },
      { id: "in_progress", label: "In Progress", count: inProgressCount },
      { id: "completed", label: "Completed", count: completedCount },
    ];
  }, [resources]);

  const filteredCourses = useMemo((): MenuAcademyListItem[] => {
    let rows = [...resources];

    if (selectedTaxonomyFilter != null) {
      const field = taxonomyFieldForKind(selectedTaxonomyFilter.kind);
      rows = rows.filter(
        (row) => row[field] === selectedTaxonomyFilter.id,
      );
    }

    if (activeFilter === "mandatory") {
      rows = rows.filter((row) => row.is_mandatory);
    } else if (activeFilter === "not_started") {
      rows = rows.filter((row) =>
        isNotStartedMemberState(row.member_state),
      );
    } else if (activeFilter === "in_progress") {
      rows = rows.filter((row) => row.member_state?.status === "seen");
    } else if (activeFilter === "completed") {
      rows = rows.filter((row) => row.member_state?.status === "completed");
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (normalizedSearch) {
      rows = rows.filter((row) => {
        const courseLabel = taxonomyLabelById.get(row.course_id ?? -1) ?? "";
        const periodLabel = taxonomyLabelById.get(row.period_id ?? -1) ?? "";
        return (
          row.title.toLowerCase().includes(normalizedSearch) ||
          courseLabel.toLowerCase().includes(normalizedSearch) ||
          periodLabel.toLowerCase().includes(normalizedSearch)
        );
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "z-a") return b.title.localeCompare(a.title);
      const aTime = new Date(a.published_at ?? a.created_at).getTime();
      const bTime = new Date(b.published_at ?? b.created_at).getTime();
      return bTime - aTime;
    });

    return rows.map((row, index) => {
      const thumbnail = row.thumbnail_url?.trim() || null;
      const resolvedThumbnail = thumbnail
        ? resolveFranchiseResourceFileUrl(thumbnail, getPublicUrl)
        : null;
      return {
        id: row.id,
        title: row.title,
        categoryLabel:
          taxonomyLabelById.get(row.course_id ?? -1) ?? "Uncategorized",
        image: resolvedThumbnail ?? DEFAULT_COURSE_IMAGE,
        usesFallbackImage: resolvedThumbnail == null,
        gradient: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
        duration: formatCourseDuration(row.course_duration),
        memberStatus: row.member_state?.status ?? null,
      };
    });
  }, [
    activeFilter,
    resources,
    searchQuery,
    selectedTaxonomyFilter,
    sortBy,
    taxonomyLabelById,
    getPublicUrl,
  ]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

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
    <MemberPortalBackground variant="light">
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
        theme="light"
      />

      <div className={`py-6 ${MEMBER_PORTAL_LIGHT_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">
                Menu Academy
              </h1>
              <p className="text-sm text-muted-foreground">
                Learning courses for franchise menu standards
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="text-base text-muted-foreground">
            <span>Learning</span>
            <span className="mx-1.5 text-border">/</span>
            <span className="font-semibold text-foreground">Courses</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveFilter("not_started")}
              aria-label="Notifications"
              aria-pressed={activeFilter === "not_started"}
              className={`flex h-9 w-9 items-center justify-center rounded border transition-colors ${
                activeFilter === "not_started"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("mandatory")}
              aria-label="My learning"
              aria-pressed={activeFilter === "mandatory"}
              className={`flex h-9 w-9 items-center justify-center rounded border transition-colors ${
                activeFilter === "mandatory"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container max-w-[1600px] py-5 pb-16">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-[250px]">
            <div className="mb-6">
              <div className="label-badge mb-2.5">Filter By</div>
              <div className="flex flex-col gap-1.5">
                {courseFilters.map((filter) => (
                  <FilterButton
                    key={filter.id}
                    label={filter.label}
                    count={filter.count}
                    active={activeFilter === filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                  />
                ))}
              </div>
            </div>

            {TAXONOMY_FILTER_GROUPS.map((group) => {
              const options = taxonomiesByKind[group.kind];
              const counts = taxonomyCounts[group.kind];

              return (
                <div key={group.kind} className="mb-6">
                  <div className="label-badge mb-2.5">{group.label}</div>
                  <div className="flex flex-col gap-1.5">
                    {catalogLoading ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </div>
                    ) : (
                      <>
                        <FilterButton
                          label={group.allLabel}
                          count={resources.length}
                          active={selectedTaxonomyFilter === null}
                          onClick={() => setSelectedTaxonomyFilter(null)}
                        />
                        {options.length === 0 ? (
                          <p className="px-4 py-2 text-sm text-muted-foreground">
                            No {group.label.toLowerCase()} taxonomies yet.
                          </p>
                        ) : (
                          options.map((option) => (
                            <FilterButton
                              key={option.id}
                              label={option.label}
                              count={counts.get(option.id) ?? 0}
                              active={
                                selectedTaxonomyFilter?.kind === group.kind &&
                                selectedTaxonomyFilter.id === option.id
                              }
                              onClick={() =>
                                setSelectedTaxonomyFilter({
                                  kind: group.kind,
                                  id: option.id,
                                })
                              }
                            />
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full max-w-md">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search..."
                  className="flex-1 rounded-l border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
                />
                <button
                  type="button"
                  className="rounded-r bg-primary px-4 py-2.5 text-primary-foreground transition-colors hover:bg-primary/90"
                  aria-label="Search courses"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="mr-2.5 font-semibold text-foreground">Sort by:</span>
                {(
                  [
                    ["a-z", "A-Z"],
                    ["z-a", "Z-A"],
                    ["recent", "Recently Added"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSortBy(value)}
                    className={`mr-2.5 transition-colors ${
                      sortBy === value
                        ? "font-medium text-primary"
                        : "hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {catalogLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading courses…
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
                No courses match your current filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredCourses.map((course) => (
                  <CourseCardTile key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MemberPortalBackground>
  );
}
