"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import { MEMBER_PORTAL_LIGHT_BANNER_CLASS } from "@/lib/member-portal-surfaces";
import { useSupabase } from "@/hooks/useSupabase";
import { hasPrivilege } from "@/lib/privileges";
import type { UserProfile } from "@/types";
import {
  Bell,
  BookOpen,
  GraduationCap,
  Loader2,
  Search,
} from "lucide-react";
import {
  FRANCHISE_MENU_ACADEMY_COURSES,
  type FranchiseAcademyCourse,
} from "@/lib/franchise-menu-academy-courses";
import { toast } from "sonner";

type CourseFilterId =
  | "all"
  | "mandatory"
  | "enrolled"
  | "in_progress"
  | "completed";

type SortOption = "a-z" | "z-a" | "recent";

const COURSE_FILTERS: {
  id: CourseFilterId;
  label: string;
  count: number;
}[] = [
  { id: "all", label: "All Courses", count: 65 },
  { id: "mandatory", label: "Mandatory", count: 65 },
  { id: "enrolled", label: "Enrolled", count: 0 },
  { id: "in_progress", label: "In Progress", count: 61 },
  { id: "completed", label: "Completed", count: 0 },
];

const COURSE_CATEGORIES = [
  "All Categories",
  "*New Menu - Q1 2025*",
  "01 FRIED CHICKEN",
  "02 GRILLED CHICKEN",
  "03 KOREAN CLASSICS",
  "04 DELIGHTS",
  "05 BURGERS",
  "06 KID'S",
  "07 BEVERAGE",
] as const;

const TAG_CLOUD: { label: string; className: string }[] = [
  { label: "All Tags", className: "text-xs underline" },
  { label: "DRINKS", className: "text-2xl uppercase" },
  { label: "BARGAIN MEAL", className: "text-base uppercase underline" },
  { label: "DELIGHTS", className: "text-lg uppercase underline" },
  { label: "Grilled", className: "text-base underline" },
  { label: "Chicken", className: "text-sm" },
  { label: "SPECIALS", className: "text-sm uppercase underline" },
  { label: "SIGNATURE", className: "text-xs uppercase underline" },
  { label: "APPETIZERS", className: "text-xs uppercase underline" },
  { label: "FOR ONE", className: "text-[11px] uppercase underline" },
  { label: "BURGERS", className: "text-xs uppercase underline" },
];

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

function CourseCardTile({ course }: { course: FranchiseAcademyCourse }) {
  return (
    <Link
      href={`/member/menu-academy/${course.id}`}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:border-primary/30 hover:shadow-md"
    >
      <div
        className={`relative flex h-40 items-center justify-center bg-gradient-to-b ${course.gradient}`}
      >
        <div className="relative h-[120px] w-10 overflow-hidden rounded-sm opacity-80">
          <AppImage
            src={course.image}
            alt=""
            fill
            className="object-cover"
            aria-hidden
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="section-label mb-1 text-[11px]">
          {course.category}
        </p>
        <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {course.title}
        </h3>
        {course.progress != null ? (
          <div className="mt-auto">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span>{course.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="tag-pill mt-auto text-[10px] uppercase tracking-wide">
            Not started
          </span>
        )}
      </div>
    </Link>
  );
}

export default function FranchiseMenuAcademy() {
  const router = useRouter();
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();

  const [activeFilter, setActiveFilter] = useState<CourseFilterId>("all");
  const [activeCategory, setActiveCategory] =
    useState<(typeof COURSE_CATEGORIES)[number]>("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const hasFranchise = hasPrivilege(authMetadata.privileges, "franchise");

  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getContactName(profile),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

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

  const filteredCourses = useMemo(() => {
    let courses = [...FRANCHISE_MENU_ACADEMY_COURSES];

    if (activeCategory !== "All Categories") {
      courses = courses.filter((course) => course.category === activeCategory);
    }

    if (activeFilter === "mandatory") {
      courses = courses.filter((course) => course.status === "mandatory");
    } else if (activeFilter === "enrolled") {
      courses = courses.filter((course) => course.progress != null);
    } else if (activeFilter === "in_progress") {
      courses = courses.filter((course) => course.status === "in_progress");
    } else if (activeFilter === "completed") {
      courses = courses.filter((course) => course.progress === 100);
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (normalizedSearch) {
      courses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(normalizedSearch) ||
          course.category.toLowerCase().includes(normalizedSearch),
      );
    }

    courses.sort((a, b) => {
      if (sortBy === "a-z") return a.title.localeCompare(b.title);
      if (sortBy === "z-a") return b.title.localeCompare(a.title);
      return Number(b.id) - Number(a.id);
    });

    return courses;
  }, [activeCategory, activeFilter, searchQuery, sortBy]);

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
              className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="My learning"
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
                {COURSE_FILTERS.map((filter) => (
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

            <div className="mb-6">
              <div className="label-badge mb-2.5">Categories</div>
              <div className="flex flex-col gap-1.5">
                {COURSE_CATEGORIES.map((category) => (
                  <CategoryButton
                    key={category}
                    label={category}
                    active={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  />
                ))}
              </div>
            </div>

            <div className="leading-relaxed">
              {TAG_CLOUD.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  className={`mr-1.5 inline cursor-pointer border-0 bg-transparent p-0 font-inherit text-brand-amber transition-opacity hover:text-accent hover:opacity-80 ${tag.className}`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
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

            {filteredCourses.length === 0 ? (
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
