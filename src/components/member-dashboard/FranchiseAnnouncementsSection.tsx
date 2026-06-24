"use client";

import Link from "@/components/link";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DEFAULT_FRANCHISE_QUICK_LINKS,
  FRANCHISE_ANNOUNCEMENT_GROUPS,
  PLACEHOLDER_FRANCHISE_ANNOUNCEMENTS,
  formatAnnouncementEventDate,
  type FranchiseAnnouncement,
  type FranchiseAnnouncementAudience,
  type FranchiseQuickLink,
} from "./franchise-announcements";

export type FranchiseAnnouncementsSectionProps = {
  announcements?: FranchiseAnnouncement[];
  quickLinks?: FranchiseQuickLink[];
  loading?: boolean;
};

function AnnouncementCard({ announcement }: { announcement: FranchiseAnnouncement }) {
  const { day, month } = formatAnnouncementEventDate(announcement.eventDate);
  const content = (
    <>
      <div className="mb-4 flex items-start gap-4">
        <div className="shrink-0 text-center leading-none text-[#a82e2e]">
          <div className="text-[32px] font-bold">{day}</div>
          <div className="mt-0.5 text-sm">{month}</div>
        </div>
        <h3 className="m-0 text-lg font-bold text-black">{announcement.title}</h3>
      </div>
      <p className="m-0 text-sm leading-relaxed text-[#555]">{announcement.body}</p>
    </>
  );

  const className =
    "flex flex-1 flex-col rounded-xl border border-[#e5e5e5] p-6 transition-colors hover:border-[#d0d0d0]";

  if (announcement.href) {
    return (
      <Link href={announcement.href} className={`${className} no-underline`}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

export default function FranchiseAnnouncementsSection({
  announcements = PLACEHOLDER_FRANCHISE_ANNOUNCEMENTS,
  quickLinks = DEFAULT_FRANCHISE_QUICK_LINKS,
  loading = false,
}: FranchiseAnnouncementsSectionProps) {
  const [activeGroup, setActiveGroup] =
    useState<FranchiseAnnouncementAudience>("to_everyone");

  const filteredAnnouncements = useMemo(
    () => announcements.filter((item) => item.audience === activeGroup),
    [activeGroup, announcements],
  );

  return (
    <section className="relative rounded-[20px] bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.05)] sm:p-10">
      <div
        className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-sm bg-[#e0e0e0]"
        aria-hidden
      />

      <h2 className="mb-6 mt-2 font-serif text-[32px] font-normal text-[#111] sm:mb-8">
        Announcements and Events
      </h2>

      <div className="mb-6 flex flex-wrap gap-2 sm:mb-8">
        {FRANCHISE_ANNOUNCEMENT_GROUPS.map((group) => {
          const isActive = activeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroup(group.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#a82e2e] text-white"
                  : "bg-[#f3f3f3] text-[#333] hover:bg-[#e8e8e8]"
              }`}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <nav
          aria-label="Franchise resources"
          className="flex w-full shrink-0 flex-row flex-wrap gap-5 lg:w-[180px] lg:flex-col lg:gap-5"
        >
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[15px] no-underline transition-colors ${
                link.active
                  ? "font-bold text-black"
                  : "text-[#333] hover:text-black"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-[#555]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading announcements…
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <p className="flex flex-1 items-center py-10 text-sm text-[#555]">
            No announcements in this category yet.
          </p>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredAnnouncements.map((announcement) => (
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
