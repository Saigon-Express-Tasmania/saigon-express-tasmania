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
  ChevronRight,
  FileText,
  KeyRound,
  Library,
  Loader2,
  Lock,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const PANEL_CLASS =
  "rounded-xl bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.03)]";

const SECTION_TITLE_CLASS =
  "m-0 text-base font-medium uppercase tracking-wide text-primary";

const RECIPE_IMAGE = "/manus-storage/crispyroastporkbanhmi_ce355122.jpg";

const CSR_IMAGE = "/manus-storage/wholesale-restaurant-counter_2d79d665.jpg";

const CALENDAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const CALENDAR_DAYS = ["7", "8", "9", "10", "11", "12", "13"] as const;

const SOP_DOCUMENTS = [
  { title: "Company Title", version: "1.0" },
  { title: "Standard Operating Procedure", version: "1.1" },
  { title: "Standard Operating Procedure", version: "1.0" },
  { title: "Corporate Social Responsibility", version: "1.1" },
] as const;

const OPERATIONAL_DOCUMENTS = [
  { title: "Operation Manual 1", version: "1.0" },
  { title: "Operation Manual 2", version: "1.0" },
  { title: "Operation Manual 3", version: "1.1" },
] as const;

const HQ_RESOURCES = [
  "Sensitive contacts",
  "Budget sheets",
  "with an extra visual badge",
] as const;

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function DocumentTable({
  documents,
  query = "",
}: {
  documents: readonly { title: string; version: string }[];
  query?: string;
}) {
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documents;
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(normalized),
    );
  }, [documents, query]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,1fr)] gap-3 border-b border-gray-200 pb-2.5 text-[13px] text-gray-500">
          <div>Title</div>
          <div>File</div>
          <div>Version</div>
          <div />
        </div>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-gray-500">
            No documents match your search.
          </p>
        ) : (
          filtered.map((doc, index) => (
            <div
              key={`${doc.title}-${doc.version}-${index}`}
              className={`grid grid-cols-[minmax(0,2fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,1fr)] items-center gap-3 py-3 text-[13px] text-gray-800 ${
                index < filtered.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <div>{doc.title}</div>
              <div>
                <FileText className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div>{doc.version}</div>
              <button
                type="button"
                className="rounded bg-primary px-3 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Download
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function FranchiseResourcesHub() {
  const router = useRouter();
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();
  const [operationalSearch, setOperationalSearch] = useState("");

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
              <Library className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">
                Resources Hub
              </h1>
              <p className="text-sm text-gray-500">
                Franchise documents, recipes, and operational resources
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl py-8 pb-16">
        <h2 className="mb-8 mt-0 font-serif text-[32px] font-normal text-gray-900">
          Franchise Intranet — Resources
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className={PANEL_CLASS}>
            <h3 className={`${SECTION_TITLE_CLASS} mb-5`}>Upcoming Event</h3>
            <div className="relative rounded-lg border border-gray-100 bg-gray-50 p-4 pb-16">
              <div className="mb-2.5 grid grid-cols-7 text-center text-xs text-gray-500">
                {CALENDAR_WEEKDAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 text-center text-xs text-gray-800">
                {CALENDAR_DAYS.map((day) => (
                  <div
                    key={day}
                    className={
                      day === "11"
                        ? "rounded bg-primary/10 px-0.5 py-0.5 font-medium text-primary"
                        : ""
                    }
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="absolute left-[5%] top-14 flex w-[90%] gap-4 rounded-lg bg-white p-4 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                <div className="min-w-[50px] rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2.5 text-center">
                  <div className="text-sm font-bold text-gray-700">Oct</div>
                  <div className="text-xl font-bold text-gray-900">12</div>
                </div>
                <div className="min-w-0">
                  <h4 className="m-0 text-base font-semibold text-gray-900">
                    GAMI Team Building
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    Serif date: 12, 2022
                    <br />
                    Details: GAMI Indillation and Events
                    <br />
                    Location: Swirii Rovena
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={`${PANEL_CLASS} flex flex-col overflow-hidden p-0 sm:flex-row`}>
            <div className="relative min-h-[200px] w-full shrink-0 sm:min-h-[220px] sm:w-[45%]">
              <AppImage
                src={RECIPE_IMAGE}
                alt="Root Vietnamese-inspired recipe"
                fill
                className="object-cover"
              />
              <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                Recipe
              </span>
            </div>
            <div className="flex w-full flex-col justify-center px-6 py-6 sm:w-[55%]">
              <h3 className="m-0 font-serif text-[22px] font-normal text-gray-900">
                Root Vietnamese-inspired
              </h3>
              <p className="mb-2 mt-4 text-[13px] font-bold text-gray-800">
                Highlights:
              </p>
              <ul className="mb-6 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-gray-600">
                <li>Vietnamese inspired food carts</li>
                <li>Riemlitezing healtht and coolins</li>
              </ul>
              <button
                type="button"
                className="inline-flex w-fit rounded bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-primary/90"
              >
                View Full Recipe
              </button>
            </div>
          </section>

          <section className={PANEL_CLASS}>
            <h3 className={`${SECTION_TITLE_CLASS} mb-5`}>
              Standard Operating Procedure
            </h3>
            <DocumentTable documents={SOP_DOCUMENTS} />
          </section>

          <section className={PANEL_CLASS}>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className={SECTION_TITLE_CLASS}>
                Operational Support Document
              </h3>
              <div className="relative w-full max-w-[160px]">
                <input
                  type="search"
                  value={operationalSearch}
                  onChange={(event) => setOperationalSearch(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded border border-gray-300 py-1.5 pl-2.5 pr-8 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Search
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary"
                  aria-hidden
                />
              </div>
            </div>
            <DocumentTable
              documents={OPERATIONAL_DOCUMENTS}
              query={operationalSearch}
            />
          </section>

          <section className={PANEL_CLASS}>
            <h3 className={`${SECTION_TITLE_CLASS} mb-5`}>CSR</h3>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative h-[110px] w-full shrink-0 overflow-hidden rounded-lg sm:w-40">
                <AppImage
                  src={CSR_IMAGE}
                  alt="CSR activity"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="m-0 font-serif text-lg font-normal text-gray-900">
                  CSR
                </h4>
                <p className="mb-4 mt-2 text-[13px] leading-relaxed text-gray-600">
                  Corporate Social Responsibility is on our community&apos;s
                  support and for socnooted partners.
                </p>
                <Link
                  href="#"
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-primary no-underline hover:text-primary/80"
                >
                  Full story
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </section>

          <section className={PANEL_CLASS}>
            <h3 className={`${SECTION_TITLE_CLASS} mb-5`}>
              Internal Resource — HQ Only
            </h3>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
              <div className="flex w-full flex-col items-center justify-center rounded-lg border border-primary bg-primary/5 px-5 py-5 text-center sm:w-36 sm:shrink-0">
                <KeyRound className="mb-2.5 h-8 w-8 text-primary" aria-hidden />
                <p className="m-0 text-[13px] font-bold leading-snug text-gray-900">
                  Restricted access to kill your recouites.
                </p>
              </div>
              <div className="relative min-w-0 flex-1 pb-10 sm:pb-0">
                <p className="m-0 text-[13px] leading-relaxed text-gray-700">
                  Restricted access on ascrest restricted access to thin cmmony
                  lowst.
                </p>
                <p className="mb-1 mt-4 text-[13px] font-bold text-gray-800">
                  HQ Resources:
                </p>
                <ul className="m-0 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-gray-600">
                  {HQ_RESOURCES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md sm:bottom-0"
                  aria-hidden
                >
                  <Lock className="h-4 w-4" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-1 gap-y-1">
            <Link href="#" className="text-gray-500 no-underline hover:text-gray-700">
              Legal
            </Link>
            <span aria-hidden>|</span>
            <Link
              href="/privacy-policy"
              className="text-gray-500 no-underline hover:text-gray-700"
            >
              Privacy
            </Link>
            <span aria-hidden>|</span>
            <Link href="#" className="text-gray-500 no-underline hover:text-gray-700">
              Links
            </Link>
            <span aria-hidden>|</span>
            <Link href="#" className="text-gray-500 no-underline hover:text-gray-700">
              Content Policy
            </Link>
          </div>
          <div>Claromentis author</div>
        </footer>
      </div>
    </MemberPortalBackground>
  );
}
