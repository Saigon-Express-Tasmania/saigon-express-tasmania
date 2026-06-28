"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import FranchiseResourceContent from "@/components/franchise-resources/FranchiseResourceContent";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import { supabase } from "@/lib/supabase/client";
import { useSupabase } from "@/hooks/useSupabase";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { hasPrivilege } from "@/lib/privileges";
import type { FranchiseResourceContentData } from "@/types/franchise-resources";
import {
  normalizeAttachedFiles,
  resolveFranchiseResourceFileUrl,
} from "@/types/franchise-resources";
import type { UserProfile } from "@/types";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  Clock,
  Info,
  Loader2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

const PANEL_CLASS =
  "rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6";

const CARD_GRADIENTS = [
  "from-primary/10 to-card",
  "from-brand-amber/20 to-card",
  "from-primary/5 to-secondary",
  "from-brand-amber/15 to-card",
  "from-primary/8 to-brand-cream",
  "from-secondary to-card",
] as const;

const DEFAULT_COURSE_IMAGE =
  "/manus-storage/crispyroastporkbanhmi_ce355122.jpg";

type MemberResourceState = {
  status: "not_seen" | "seen" | "completed";
  first_seen_at: string | null;
  last_seen_at: string | null;
  completed_at: string | null;
  progress_percent: number;
};

type MenuAcademyCourseDetail = FranchiseResourceContentData & {
  id: number;
  category_id: number | null;
  is_mandatory: boolean;
  course_duration: string | null;
  author_name: string | null;
  updated_at: string;
  member_state: MemberResourceState | null;
};

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function normalizeMemberState(
  value: MemberResourceState | MemberResourceState[] | null | undefined,
): MemberResourceState | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function normalizeCourseDetail(
  raw: Record<string, unknown>,
): MenuAcademyCourseDetail {
  const memberState = normalizeMemberState(
    raw.member_state as MemberResourceState | MemberResourceState[] | null,
  );

  return {
    id: raw.id as number,
    title: raw.title as string,
    category_id: (raw.category_id as number | null) ?? null,
    author_name: (raw.author_name as string | null) ?? null,
    description: (raw.description as string | null) ?? null,
    summary: (raw.summary as string | null) ?? null,
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
    published_at: (raw.published_at as string | null) ?? null,
    created_at: (raw.created_at as string | null) ?? null,
    updated_at: raw.updated_at as string,
    is_mandatory: Boolean(raw.is_mandatory),
    course_duration: (raw.course_duration as string | null) ?? null,
    member_state: memberState,
  };
}

function formatMemberDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
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

async function markMenuAcademyResourceSeen(
  userId: string,
  resourceId: number,
  memberState: MemberResourceState | null,
): Promise<MemberResourceState> {
  const now = new Date().toISOString();

  if (memberState?.status === "completed") {
    const { data, error } = await supabase
      .from("franchise_resource_member_states")
      .update({ last_seen_at: now })
      .eq("resource_id", resourceId)
      .eq("user_id", userId)
      .select(
        "status, first_seen_at, last_seen_at, completed_at, progress_percent",
      )
      .single();
    if (error) throw error;
    return data as MemberResourceState;
  }

  if (memberState) {
    const { data, error } = await supabase
      .from("franchise_resource_member_states")
      .update({
        status: "seen",
        last_seen_at: now,
      })
      .eq("resource_id", resourceId)
      .eq("user_id", userId)
      .select(
        "status, first_seen_at, last_seen_at, completed_at, progress_percent",
      )
      .single();
    if (error) throw error;
    return data as MemberResourceState;
  }

  const { data, error } = await supabase
    .from("franchise_resource_member_states")
    .insert({
      resource_id: resourceId,
      user_id: userId,
      status: "seen",
      last_seen_at: now,
      is_favourite: false,
    })
    .select(
      "status, first_seen_at, last_seen_at, completed_at, progress_percent",
    )
    .single();
  if (error) throw error;
  return data as MemberResourceState;
}

async function updateMenuAcademyMemberStatus(
  userId: string,
  resourceId: number,
  status: "seen" | "completed",
  memberState: MemberResourceState | null,
): Promise<MemberResourceState> {
  const now = new Date().toISOString();

  if (memberState) {
    const { data, error } = await supabase
      .from("franchise_resource_member_states")
      .update({
        status,
        last_seen_at: now,
      })
      .eq("resource_id", resourceId)
      .eq("user_id", userId)
      .select(
        "status, first_seen_at, last_seen_at, completed_at, progress_percent",
      )
      .single();
    if (error) throw error;
    return data as MemberResourceState;
  }

  const { data, error } = await supabase
    .from("franchise_resource_member_states")
    .insert({
      resource_id: resourceId,
      user_id: userId,
      status,
      last_seen_at: now,
      is_favourite: false,
    })
    .select(
      "status, first_seen_at, last_seen_at, completed_at, progress_percent",
    )
    .single();
  if (error) throw error;
  return data as MemberResourceState;
}

function AcademyCourseToolbar({ courseTitle }: { courseTitle: string }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="container flex items-center justify-between py-4">
        <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/member/menu-academy" className="hover:text-foreground">
            Learning
          </Link>
          <span className="mx-1.5 text-border">/</span>
          <Link
            href="/member/menu-academy"
            className="hover:text-foreground"
          >
            Courses
          </Link>
          <span className="mx-1.5 text-border">/</span>
          <span className="font-semibold text-foreground">{courseTitle}</span>
        </nav>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="My learning"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseHeroVisual({
  image,
  gradient,
  title,
}: {
  image: string;
  gradient: string;
  title: string;
}) {
  return (
    <div
      className={`relative h-60 w-full overflow-hidden rounded-lg bg-gradient-to-b ${gradient}`}
    >
      <AppImage src={image} alt={title} fill className="object-cover" />
    </div>
  );
}

function CourseCompletionToggle({
  completed,
  isSaving,
  onChange,
}: {
  completed: boolean;
  isSaving: boolean;
  onChange: (completed: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={completed}
      aria-busy={isSaving}
      onClick={() => onChange(!completed)}
      className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
        completed
          ? "border-emerald-200 bg-emerald-50/90 hover:bg-emerald-50"
          : "border-border bg-card hover:bg-secondary/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            completed
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-muted-foreground/35 bg-background"
          }`}
        >
          {completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm font-semibold ${
              completed ? "text-emerald-800" : "text-foreground"
            }`}
          >
            Mark as completed
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {completed
              ? "This course is marked complete on your record."
              : "Check when you have finished this training."}
          </span>
        </span>
        {isSaving ? (
          <Loader2
            className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
    </button>
  );
}

function ModuleInfoPanel({
  course,
  categoryLabel,
  dateCreated,
  dateModified,
}: {
  course: MenuAcademyCourseDetail;
  categoryLabel: string;
  dateCreated: string;
  dateModified: string;
}) {
  const ownerName = course.author_name?.trim() || "—";

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-5 py-3 text-sm font-semibold text-foreground">
        <Info className="h-4 w-4" />
        Info
      </div>
      <dl className="flex flex-col gap-4 p-5 text-[13px]">
        <div className="flex items-center">
          <dt className="w-40 shrink-0 pr-8 text-right font-medium text-muted-foreground">
            Category
          </dt>
          <dd className="font-medium text-foreground">{categoryLabel}</dd>
        </div>
        <div className="flex items-center">
          <dt className="w-40 shrink-0 pr-8 text-right font-medium text-muted-foreground">
            Owner
          </dt>
          <dd className="font-medium text-foreground">{ownerName}</dd>
        </div>
        <div className="flex items-center">
          <dt className="w-40 shrink-0 pr-8 text-right font-medium text-muted-foreground">
            Date created
          </dt>
          <dd className="text-muted-foreground">{dateCreated}</dd>
        </div>
        <div className="flex items-center">
          <dt className="w-40 shrink-0 pr-8 text-right font-medium text-muted-foreground">
            Last modified
          </dt>
          <dd className="text-muted-foreground">
            {dateModified}
            {course.author_name?.trim() ? ` by ${course.author_name.trim()}` : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function CourseDetailMain({
  course,
  categoryLabel,
}: {
  course: MenuAcademyCourseDetail;
  categoryLabel: string;
}) {
  const dateCreated =
    formatMemberDate(course.created_at) ?? "—";
  const dateModified =
    formatMemberDate(course.updated_at) ?? "—";

  return (
    <>
      <FranchiseResourceContent
        resource={course}
        layout="hub"
        hideHeader
        videoFirst
      />

      <ModuleInfoPanel
        course={course}
        categoryLabel={categoryLabel}
        dateCreated={dateCreated}
        dateModified={dateModified}
      />
    </>
  );
}

type FranchiseMenuAcademyCourseProps = {
  courseId: string;
};

export default function FranchiseMenuAcademyCourse({
  courseId,
}: FranchiseMenuAcademyCourseProps) {
  const router = useRouter();
  const { user, profile, authMetadata, isLoading, isSignedIn, signOut } =
    useSupabase();
  const { getPublicUrl } = useSupabaseStorage();

  const hasFranchise = hasPrivilege(authMetadata.privileges, "franchise");
  const resourceId = Number.parseInt(courseId, 10);
  const userId = user?.id ?? null;

  const [courseLoading, setCourseLoading] = useState(true);
  const [course, setCourse] = useState<MenuAcademyCourseDetail | null>(null);
  const [categoryLabel, setCategoryLabel] = useState("Uncategorized");
  const [completed, setCompleted] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const shouldPersistCompletionRef = useRef(false);
  const seenMarkedRef = useRef<number | null>(null);
  const courseRef = useRef<MenuAcademyCourseDetail | null>(null);
  courseRef.current = course;

  const handleCompletedChange = useCallback((value: boolean) => {
    shouldPersistCompletionRef.current = true;
    setCompleted(value);
  }, []);

  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getContactName(profile),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const loadCourse = useCallback(async () => {
    if (!Number.isInteger(resourceId) || resourceId <= 0) {
      setCourse(null);
      setCourseLoading(false);
      return;
    }

    setCourseLoading(true);
    try {
      const { data, error } = await supabase
        .from("franchise_resources")
        .select(
          `
          id,
          title,
          category_id,
          author_name,
          description,
          summary,
          content,
          content_format,
          attached_files,
          content_file,
          video_file,
          thumbnail_url,
          course_duration,
          version,
          tags,
          external_url,
          estimated_read_minutes,
          is_mandatory,
          published_at,
          created_at,
          updated_at,
          member_state:franchise_resource_member_states (
            status,
            first_seen_at,
            last_seen_at,
            completed_at,
            progress_percent
          )
        `,
        )
        .eq("id", resourceId)
        .eq("type", "menu_training")
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setCourse(null);
        return;
      }

      const normalized = normalizeCourseDetail(data as Record<string, unknown>);
      setCourse(normalized);

      if (normalized.category_id != null) {
        const { data: taxonomy, error: taxonomyError } = await supabase
          .from("franchise_resource_taxonomies")
          .select("label")
          .eq("id", normalized.category_id)
          .eq("place", "academy")
          .eq("kind", "category")
          .maybeSingle();

        if (taxonomyError) throw taxonomyError;
        setCategoryLabel(taxonomy?.label?.trim() || "Uncategorized");
      } else {
        setCategoryLabel("Uncategorized");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load course.",
      );
      setCourse(null);
    } finally {
      setCourseLoading(false);
    }
  }, [resourceId]);

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
    void loadCourse();
  }, [hasFranchise, isLoading, isSignedIn, loadCourse, router]);

  useEffect(() => {
    seenMarkedRef.current = null;
    shouldPersistCompletionRef.current = false;
  }, [resourceId]);

  useEffect(() => {
    if (!course || courseLoading) return;
    setCompleted(course.member_state?.status === "completed");
    shouldPersistCompletionRef.current = false;
  }, [course?.id, courseLoading]);

  useEffect(() => {
    if (!userId || !course || courseLoading) return;
    if (seenMarkedRef.current === course.id) return;

    const memberState = course.member_state;
    if (memberState?.status === "completed") {
      seenMarkedRef.current = course.id;
      return;
    }
    if (memberState != null && memberState.status !== "not_seen") {
      seenMarkedRef.current = course.id;
      return;
    }

    seenMarkedRef.current = course.id;
    void (async () => {
      try {
        const nextState = await markMenuAcademyResourceSeen(
          userId,
          course.id,
          memberState,
        );
        setCourse((current) =>
          current ? { ...current, member_state: nextState } : current,
        );
      } catch (err) {
        seenMarkedRef.current = null;
        toast.error(
          err instanceof Error ? err.message : "Failed to update course status.",
        );
      }
    })();
  }, [course, courseLoading, userId]);

  useEffect(() => {
    if (!userId || !shouldPersistCompletionRef.current) return;

    const timer = window.setTimeout(() => {
      const currentCourse = courseRef.current;
      if (!currentCourse) return;

      void (async () => {
        setIsSavingStatus(true);
        try {
          const nextStatus = completed ? "completed" : "seen";
          const nextState = await updateMenuAcademyMemberStatus(
            userId,
            currentCourse.id,
            nextStatus,
            currentCourse.member_state,
          );
          shouldPersistCompletionRef.current = false;
          setCourse((current) =>
            current ? { ...current, member_state: nextState } : current,
          );
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to save completion status.",
          );
          shouldPersistCompletionRef.current = false;
          setCompleted(
            courseRef.current?.member_state?.status === "completed",
          );
        } finally {
          setIsSavingStatus(false);
        }
      })();
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [completed, userId]);

  useEffect(() => {
    if (courseLoading || isLoading) return;
    if (!isSignedIn || !hasFranchise) return;
    if (!course) {
      router.push("/member/menu-academy");
    }
  }, [course, courseLoading, hasFranchise, isLoading, isSignedIn, router]);

  const heroImage = useMemo(() => {
    const thumbnail = course?.thumbnail_url?.trim();
    if (!thumbnail) return DEFAULT_COURSE_IMAGE;
    return resolveFranchiseResourceFileUrl(thumbnail, getPublicUrl);
  }, [course?.thumbnail_url, getPublicUrl]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  if (
    isLoading ||
    courseLoading ||
    !isSignedIn ||
    !profile ||
    !me ||
    !hasFranchise ||
    !course
  ) {
    return (
      <MemberPortalBackground
        variant="light"
        className="flex items-center justify-center"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </MemberPortalBackground>
    );
  }

  const heroGradient = CARD_GRADIENTS[course.id % CARD_GRADIENTS.length];
  const durationLabel = formatCourseDuration(course.course_duration);
  const memberState = course.member_state;
  const startedAt =
    formatMemberDate(memberState?.first_seen_at) ??
    formatMemberDate(memberState?.last_seen_at);

  return (
    <MemberPortalBackground variant="light">
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
        theme="light"
      />

      <AcademyCourseToolbar courseTitle={course.title} />

      <div className="container max-w-[1400px] py-8 pb-16">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-8">
          <aside
            className={`${PANEL_CLASS} flex w-full shrink-0 flex-col items-center xl:w-[360px]`}
          >
            <CourseHeroVisual
              image={heroImage}
              gradient={heroGradient}
              title={course.title}
            />

            <h1 className="mb-2.5 mt-6 text-center font-serif text-[28px] font-medium text-foreground">
              {course.title}
            </h1>

            <span className="badge-ok mb-5 rounded px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              Live
            </span>

            {(course.description?.trim() || course.summary?.trim()) ? (
              <p className="mb-8 px-2.5 text-center text-sm leading-relaxed text-muted-foreground">
                {course.description?.trim() || course.summary?.trim()}
              </p>
            ) : null}

            <dl className="w-full space-y-5 border-t border-border pt-6 text-sm">
              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Started
                </dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-2">
                  {memberState?.status === "completed" ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
                        Completed
                      </span>
                      {startedAt ? (
                        <span className="text-muted-foreground">
                          {startedAt}
                        </span>
                      ) : null}
                    </>
                  ) : memberState?.status === "seen" ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200/70">
                        In progress
                      </span>
                      {startedAt ? (
                        <span className="text-muted-foreground">
                          {startedAt}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not started</span>
                  )}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Expected duration
                </dt>
                <dd className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden />
                  {durationLabel ?? "—"}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Category
                </dt>
                <dd className="text-[13px] font-semibold uppercase text-primary">
                  {categoryLabel}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Tags
                </dt>
                <dd className="text-muted-foreground">
                  {(course.tags?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {course.tags?.map((tag) => (
                        <span key={tag} className="tag-pill text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <Tag className="h-4 w-4" aria-hidden />
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 w-full">
              <CourseCompletionToggle
                completed={completed}
                isSaving={isSavingStatus}
                onChange={handleCompletedChange}
              />
            </div>

            <div className="mt-auto w-full border-t border-border/50 pt-5">
              <Link
                href="/member/menu-academy"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/80 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:border-primary/50 hover:bg-primary/70"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                Back to Menu Academy
              </Link>
            </div>
          </aside>

          <div className={`${PANEL_CLASS} min-w-0 flex-1`}>
            <CourseDetailMain course={course} categoryLabel={categoryLabel} />
          </div>
        </div>
      </div>
    </MemberPortalBackground>
  );
}
