"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  getFranchiseMenuAcademyCourse,
  type FranchiseAcademyCourse,
  type FranchiseAcademyCourseModule,
} from "@/lib/franchise-menu-academy-courses";
import { useSupabase } from "@/hooks/useSupabase";
import { hasPrivilege } from "@/lib/privileges";
import type { UserProfile } from "@/types";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MoreVertical,
  Play,
  Tag,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

const PANEL_CLASS =
  "rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6";

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
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

function LemonadeHeroVisual() {
  return (
    <div className="relative flex h-60 w-full items-center justify-center overflow-hidden rounded-lg bg-[#fcf6f6]">
      <div className="relative h-[170px] w-[70px] rounded-[10px] bg-gradient-to-b from-yellow-200 to-brand-amber shadow-inner">
        <div className="absolute left-[15px] top-5 h-10 w-10 rounded-full bg-white/60" />
        <div className="absolute left-5 top-20 h-9 w-9 rounded-full bg-white/60" />
        <div className="absolute -top-7 left-[45px] h-[120px] w-1.5 rotate-[15deg] rounded-sm bg-green-400" />
      </div>
    </div>
  );
}

function CourseHeroVisual({ course }: { course: FranchiseAcademyCourse }) {
  if (course.id === "7") {
    return <LemonadeHeroVisual />;
  }

  return (
    <div
      className={`relative flex h-60 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b ${course.gradient}`}
    >
      <div className="relative h-[170px] w-[70px] overflow-hidden rounded-sm opacity-90 shadow-sm">
        <AppImage
          src={course.image}
          alt={course.title}
          fill
          className="object-cover"
        />
      </div>
    </div>
  );
}

function RecipeDetailThumbnail() {
  return (
    <div className="relative h-[125px] w-[200px] shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-brand-amber to-yellow-600 p-3 text-white">
      <div className="text-[11px] font-bold opacity-90">Saigon Express</div>
      <div className="absolute bottom-2 right-2 flex items-end gap-1">
        <div className="h-11 w-6 rounded-t-[15px] bg-blue-500" />
        <div className="h-9 w-5 rounded-t-[10px] bg-red-500" />
        <div className="h-6 w-4 rounded-t-lg bg-emerald-500" />
      </div>
      <div className="absolute bottom-2.5 left-3 max-w-[80px] text-[8px] font-normal leading-tight opacity-70">
        SAIGON EXPRESS MENU
      </div>
    </div>
  );
}

function LemonadeRecipeDocument() {
  const instructions = [
    "Pour 45 ml of Lemonade Base Mix into the hybrid glass using the jigger.",
    "Pour 200 ml of Soda Water into the glass using the measuring jug.",
    "Stir well with a soda spoon.",
    "Add 1.2 oz cubes to the glass.",
    "Add a slice of lemon into the glass.",
    "Serve with a straw in the glass.",
  ];

  const ingredients = [
    "Lemonade Base - 45 ml",
    "Soda Water - 200 ml",
    "Lemon - 1 slice (8g)",
    "Ice Cube - 10 pcs",
  ];

  const plateInfo = [
    "Jigger 30/45 ml STEEL ASY-02-CP",
    "GLASS HYBRID 420ML H05-BLB02-PAF04",
    "SPOON SODA TWISTED LUX LN01",
    "MEASURING JUG 1L SCUP-PC04-FLW01",
  ];

  return (
    <div className="mx-auto w-full max-w-[440px] rounded bg-white p-5 text-[11px] text-foreground shadow-xl">
      <div className="mb-3 border-b border-border pb-2 text-center">
        <span className="mb-0.5 block text-[8px] uppercase tracking-wide text-muted-foreground">
          Beverage
        </span>
        <h2 className="m-0 text-lg font-bold tracking-wide">Lemonade</h2>
      </div>

      <div className="mb-4 grid grid-cols-[1fr_2fr_1fr] overflow-hidden rounded border border-brand-amber bg-[#fef8e7] text-center">
        <div className="border-r border-brand-amber p-1">
          <div className="text-[8px] font-bold uppercase text-zinc-500">
            Serving Time
          </div>
          <div className="mt-0.5 font-semibold">3 mins</div>
        </div>
        <div className="border-r border-brand-amber p-1 pl-2 text-left">
          <div className="text-[8px] font-bold uppercase text-zinc-500">
            Description
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground">
            Lemon Juice, Sugar Syrup, and soda water...
          </div>
        </div>
        <div className="p-1">
          <div className="text-[8px] font-bold uppercase text-zinc-500">
            Service Type
          </div>
          <div className="mt-0.5 font-semibold">Dine In</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[1.2fr_2fr] gap-3">
        <div>
          <div className="mb-1 text-[8px] font-bold uppercase text-zinc-500">
            Menu Image
          </div>
          <div className="relative flex h-[140px] items-center justify-center overflow-hidden rounded border border-border bg-yellow-200">
            <div className="flex h-[100px] w-[30px] flex-col items-center justify-around rounded border border-border bg-white/70 py-2.5">
              <div className="h-3.5 w-3.5 rounded-full bg-brand-amber" />
              <div className="h-3.5 w-3.5 rounded-full bg-brand-amber" />
            </div>
            <div className="absolute right-12 top-2.5 h-[120px] w-1 rotate-[15deg] rounded-sm bg-green-400" />
          </div>
        </div>
        <div>
          <div className="mb-1 text-[8px] font-bold uppercase text-zinc-500">
            Making Instructions
          </div>
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-3.5 text-[9px] leading-snug text-muted-foreground">
            {instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[9px] leading-snug">
        <div className="rounded border border-border bg-secondary/50 p-2">
          <div className="mb-1 border-b border-border pb-0.5 text-[8px] font-bold uppercase">
            Ingredients
          </div>
          <ul className="m-0 flex list-[square] flex-col gap-0.5 pl-2.5 text-muted-foreground">
            {ingredients.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-border bg-secondary/50 p-2">
          <div className="mb-1 border-b border-border pb-0.5 text-[8px] font-bold uppercase">
            Plate Information
          </div>
          <ul className="m-0 flex list-[square] flex-col gap-0.5 pl-2.5 text-muted-foreground">
            {plateInfo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function GenericRecipeDocument({ course }: { course: FranchiseAcademyCourse }) {
  return (
    <div className="mx-auto w-full max-w-[440px] rounded bg-white p-5 text-[11px] text-foreground shadow-xl">
      <div className="mb-3 border-b border-border pb-2 text-center">
        <span className="mb-0.5 block text-[8px] uppercase tracking-wide text-muted-foreground">
          {course.category}
        </span>
        <h2 className="m-0 text-lg font-bold tracking-wide">{course.title}</h2>
      </div>
      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        {course.description}
      </p>
      <p className="mt-4 text-center text-[10px] italic text-muted-foreground">
        Full recipe document will be available in a future release.
      </p>
    </div>
  );
}

function ModuleExpandedHeader({
  module,
  lastAccess,
}: {
  module: FranchiseAcademyCourseModule;
  lastAccess: string;
}) {
  return (
    <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
      <RecipeDetailThumbnail />
      <div className="min-w-0 flex-1">
        <h2 className="mb-1.5 font-serif text-[26px] font-medium text-foreground">
          {module.title}
        </h2>
        <p className="m-0 text-sm text-muted-foreground">{module.subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:absolute sm:right-0 sm:top-0">
        <span className="badge-ok rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
          Live
        </span>
        <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
          In Progress
        </span>
        <span className="ml-1 text-xs text-muted-foreground">
          Last access: {lastAccess}
        </span>
      </div>
    </div>
  );
}

function MarkAsCompletedCheckbox() {
  const [completed, setCompleted] = useState(false);

  return (
    <label className="mb-6 flex cursor-pointer items-center gap-2.5 rounded-md bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-800">
      <input
        type="checkbox"
        checked={completed}
        onChange={(event) => setCompleted(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-emerald-700"
      />
      Mark as Completed
    </label>
  );
}

function ModuleInfoPanel({
  course,
  dateCreated,
  dateModified,
}: {
  course: FranchiseAcademyCourse;
  dateCreated: string;
  dateModified: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-5 py-3 text-sm font-semibold text-foreground">
        <Info className="h-4 w-4" />
        Info
      </div>
      <dl className="flex flex-col gap-4 p-5 text-[13px]">
        <div className="flex items-center">
          <dt className="w-40 shrink-0 pr-8 text-right font-medium text-muted-foreground">
            Available in
          </dt>
          <dd>
            <button type="button" className="font-medium text-primary hover:underline">
              {course.title}
            </button>
          </dd>
        </div>
        <div className="flex items-center">
          <dt className="w-40 shrink-0 pr-8 text-right font-medium text-muted-foreground">
            Owner
          </dt>
          <dd>
            <button type="button" className="font-medium text-primary hover:underline">
              Max Ji
            </button>
          </dd>
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
            {dateModified} by{" "}
            <button type="button" className="font-medium text-primary hover:underline">
              Max Ji
            </button>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function VideoPlayerControls({ duration }: { duration: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-2">
      <button
        type="button"
        className="flex items-center justify-center p-1 text-slate-700 hover:text-foreground"
        aria-label="Play"
      >
        <Play className="h-[18px] w-[18px] fill-current" />
      </button>
      <div className="whitespace-nowrap text-[13px] tabular-nums text-slate-700">
        0:00 / {duration}
      </div>
      <div className="relative h-1 flex-1 cursor-pointer rounded-sm bg-slate-300">
        <div className="absolute inset-y-0 left-0 w-0 rounded-sm bg-blue-500" />
      </div>
      <button
        type="button"
        className="flex items-center justify-center p-1 text-slate-700 hover:text-foreground"
        aria-label="Volume"
      >
        <Volume2 className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        className="flex items-center justify-center p-1 text-slate-700 hover:text-foreground"
        aria-label="More options"
      >
        <MoreVertical className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

function RecipeSection({
  course,
  module,
  showVideo,
  videoDuration,
}: {
  course: FranchiseAcademyCourse;
  module: FranchiseAcademyCourseModule;
  showVideo?: boolean;
  videoDuration?: string;
}) {
  const isLemonade = course.id === "7";

  return (
    <>
      <ModuleExpandedHeader
        module={module}
        lastAccess="25-06-2026 00:54"
      />

      {showVideo && videoDuration ? (
        <CourseVideoSection duration={videoDuration} />
      ) : null}

      <div className="relative mb-3 flex min-h-[550px] items-start justify-center rounded-md bg-zinc-700 p-10">
        {isLemonade ? (
          <LemonadeRecipeDocument />
        ) : (
          <GenericRecipeDocument course={course} />
        )}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 text-sm text-zinc-400">
          <button type="button" aria-label="Scroll up" className="hover:text-zinc-200">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute bottom-3 right-3 text-sm text-zinc-400">
          <button type="button" aria-label="Scroll down" className="hover:text-zinc-200">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new window
        </button>
      </div>
    </>
  );
}

function CourseVideoSection({ duration }: { duration: string }) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex aspect-video items-center justify-center rounded-md bg-zinc-900">
        <Play className="h-14 w-14 fill-white/80 text-white/80" />
      </div>
      <VideoPlayerControls duration={duration} />
    </div>
  );
}

function CourseModulesContent({ course }: { course: FranchiseAcademyCourse }) {
  const recipeModule = course.modules.find((module) => module.id === "recipe");
  const videoModule = course.modules.find((module) => module.id === "video");
  const isLemonade = course.id === "7";
  const duration = isLemonade ? "1:01" : "2:30";

  return (
    <>
      {recipeModule ? (
        <RecipeSection
          course={course}
          module={recipeModule}
          showVideo={!!videoModule}
          videoDuration={duration}
        />
      ) : null}

      <MarkAsCompletedCheckbox />

      <ModuleInfoPanel
        course={course}
        dateCreated="12-07-2024 14:04"
        dateModified="12-07-2024 14:04"
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
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();

  const hasFranchise = hasPrivilege(authMetadata.privileges, "franchise");
  const course = getFranchiseMenuAcademyCourse(courseId);

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
      return;
    }
    if (!course) {
      router.push("/member/menu-academy");
    }
  }, [isLoading, isSignedIn, hasFranchise, course, router]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  if (isLoading || !isSignedIn || !profile || !me || !hasFranchise || !course) {
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

      <AcademyCourseToolbar courseTitle={course.title} />

      <div className="container max-w-[1400px] py-8 pb-16">
        <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
          <aside
            className={`${PANEL_CLASS} flex w-full shrink-0 flex-col items-center xl:w-[360px]`}
          >
            <CourseHeroVisual course={course} />

            <h1 className="mb-2.5 mt-6 text-center font-serif text-[28px] font-medium text-foreground">
              {course.title}
            </h1>

            {course.lifecycleStatus === "live" ? (
              <span className="badge-ok mb-5 rounded px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                Live
              </span>
            ) : (
              <span className="mb-5 rounded bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Draft
              </span>
            )}

            <p className="mb-8 px-2.5 text-center text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>

            <dl className="w-full space-y-5 border-t border-border pt-6 text-sm">
              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Started
                </dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-2">
                  {course.enrolledAt ? (
                    <>
                      <span className="rounded bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Enrolled
                      </span>
                      <span className="text-muted-foreground">
                        {course.enrolledAt}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not enrolled</span>
                  )}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Expected duration
                </dt>
                <dd className="text-muted-foreground">
                  <Clock className="h-4 w-4" aria-hidden />
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Category
                </dt>
                <dd className="text-[13px] font-semibold uppercase text-primary">
                  {course.category}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-32 shrink-0 font-medium text-foreground">
                  Tags
                </dt>
                <dd className="text-muted-foreground">
                  {course.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {course.tags.map((tag) => (
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
          </aside>

          <div className={`${PANEL_CLASS} min-w-0 flex-1`}>
            <CourseModulesContent course={course} />
          </div>
        </div>
      </div>
    </MemberPortalBackground>
  );
}
