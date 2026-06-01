"use client";

import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { LOGO_URL } from "@/lib/site-images";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepType = "numbered" | "warning" | "success";

interface RawStep {
  type: StepType;
  text: string;
  boldPart: string;
}

interface RawBenefit {
  icon: string;
  title: string;
  desc: string;
  href: string | null;
}

interface RawPlatform {
  platform: string;
  steps: RawStep[];
}

// ─── Step badge helper ────────────────────────────────────────────────────────

const numberedCounter = 0;

function StepBadge({
  type,
  index,
}: {
  type: StepType;
  index: number;
}): React.ReactNode {
  if (type === "warning") {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-400 text-black font-bold text-xs flex items-center justify-center">
        !
      </span>
    );
  }
  if (type === "success") {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">
        ✓
      </span>
    );
  }
  // numbered — derive display number from index among all steps (caller passes 1-based)
  return (
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
      {index}
    </span>
  );
}

// ─── Render a single step row ─────────────────────────────────────────────────

function StepRow({
  step,
  displayIndex,
}: {
  step: RawStep;
  displayIndex: number;
}) {
  // Replace {boldPart}, {domain}, {appName}, {action}, {share}, {menu}, {viewMore}
  // with <strong> nodes. We split on any {…} placeholder that matches boldPart.
  const parts = step.text.split(/(\{[^}]+\})/g);

  return (
    <li className="flex gap-3">
      <StepBadge type={step.type} index={displayIndex} />
      <span>
        {parts.map((part, i) => {
          if (/^\{[^}]+\}$/.test(part)) {
            return (
              <strong key={i} className="text-white">
                {step.boldPart}
              </strong>
            );
          }
          return part;
        })}
      </span>
    </li>
  );
}

// ─── Render a platform block ──────────────────────────────────────────────────

function PlatformBlock({ data }: { data: RawPlatform }) {
  let numberedIdx = 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <p className="text-yellow-400 font-bold mb-4">{data.platform}</p>
      <ol className="space-y-3 text-white/80 text-sm">
        {data.steps.map((step, i) => {
          const displayIndex =
            step.type === "numbered" ? ++numberedIdx : numberedIdx;
          return <StepRow key={i} step={step} displayIndex={displayIndex} />;
        })}
      </ol>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GetApp() {
  const t = useTranslations("GetApp");

  const copySiteLink = () => {
    void navigator.clipboard.writeText(window.location.origin);
  };

  const benefits = t.raw("benefits") as RawBenefit[];

  const platforms = [
    t.raw("instructions.ios_safari") as RawPlatform,
    t.raw("instructions.ios_firefox") as RawPlatform,
    t.raw("instructions.android_chrome") as RawPlatform,
  ];

  return (
    <section className="bg-black text-white py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        {/* App icon */}
        <div className="w-32 h-32 rounded-[28px] bg-white mx-auto mb-4 shadow-2xl flex items-center justify-center overflow-hidden">
          <AppImage
            src={LOGO_URL}
            alt={t("brandName")}
            width={112}
            height={112}
            priority
            className="w-28 h-28 object-contain"
          />
        </div>

        <p className="text-white/60 text-sm mb-1">{t("brandName")}</p>
        <p className="text-white/60 text-xs mb-5">{t("brandDomain")}</p>

        {/* Free badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 text-white/90 text-sm px-4 py-2 rounded-full mb-8">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {t("badge")}
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2">
          {t("heading")}
        </h2>
        <p className="text-3xl md:text-4xl font-extrabold text-yellow-400 mb-6">
          {t("subheading")}
        </p>
        <p className="text-white/60 text-base max-w-xl mx-auto mb-12">
          {t.rich("description", {
            brandName: t("brandName"),
            strong: (chunks) => (
              <strong className="text-white">{chunks}</strong>
            ),
          })}
        </p>

        {/* Install instructions */}
        <div className="space-y-6 text-left mb-14">
          {platforms.map((platform, i) => (
            <PlatformBlock key={i} data={platform} />
          ))}
        </div>

        {/* Tip */}
        <p className="text-white/60 text-sm mb-12">
          {t.rich("tip", {
            safariTip: t("tipSafariBold"),
            strong: (chunks) => (
              <strong className="text-white/80">{chunks}</strong>
            ),
          })}
        </p>

        {/* Benefit cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {benefits.map((b) => {
            const inner = (
              <div
                className={`bg-white/5 border border-white/10 rounded-2xl p-5 text-left transition-colors${
                  b.href ? " hover:bg-white/10 cursor-pointer" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-xl mb-3">
                  {b.icon}
                </div>
                <p className="font-bold text-white text-sm mb-1">{b.title}</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  {b.desc}
                </p>
                {b.href && (
                  <p className="text-yellow-400 text-xs mt-2 font-semibold">
                    View deals →
                  </p>
                )}
              </div>
            );

            return b.href ? (
              <Link key={b.title} href={b.href}>
                {inner}
              </Link>
            ) : (
              <div key={b.title}>{inner}</div>
            );
          })}
        </div>

        {/* Footer copy */}
        <p className="text-white/60 text-sm mb-2">{t("shareFooterLine1")}</p>
        <p className="text-white/50 text-xs mb-6">{t("shareFooterLine2")}</p>
        <p className="text-white/70 text-sm mb-4">{t("shareLabel")}</p>

        {/* Share buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={copySiteLink}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            {t("copyLink")}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              t("whatsappMessage", { siteOrigin: SITE_ORIGIN }),
            )}`}
            suppressHydrationWarning
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t("whatsapp")}
          </a>
        </div>
      </div>
    </section>
  );
}
