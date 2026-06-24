"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  formatTrackingTokenInput,
  normalizeTrackingTokenInput,
  ORDER_TRACKING_NOT_FOUND_ERROR,
} from "@/lib/supabase/order-tracking";
import Link from "@/components/link";
import MemberHeader, {
  type MemberHeaderMember,
} from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_LIGHT_BOX_SURFACE,
  MEMBER_PORTAL_LIGHT_ROUNDED_PANEL_CLASS,
} from "@/lib/member-portal-surfaces";
import { useSupabase } from "@/hooks/useSupabase";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  Headphones,
  MessageCircle,
  Phone,
  KeyRound,
  Package,
} from "lucide-react";
import { toast } from "sonner";

type FooterCard = {
  href: string;
  title: string;
  description: string;
  icon: typeof HelpCircle;
  iconClassName: string;
  iconWrapClassName: string;
};

export default function OrderTrackingFront() {
  const t = useTranslations("OrderTrackingFront");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, authMetadata, signOut } = useSupabase();
  const [token, setToken] = useState("");

  useEffect(() => {
    if (searchParams.get("error") !== ORDER_TRACKING_NOT_FOUND_ERROR) {
      return;
    }

    router.replace(pathname, { scroll: false });
    toast.error(t("errors.orderNotFound"), { id: ORDER_TRACKING_NOT_FOUND_ERROR });
  }, [searchParams, router, pathname, t]);

  const member = useMemo<MemberHeaderMember | null>(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }

    return {
      businessName: profile.business_name ?? "Your Business",
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const footerCards = useMemo<FooterCard[]>(
    () => [
      {
        href: "/faq",
        title: t("footer.helpCenter.title"),
        description: t("footer.helpCenter.description"),
        icon: HelpCircle,
        iconWrapClassName: "bg-emerald-50 text-emerald-600",
        iconClassName: "h-4 w-4",
      },
      {
        href: "/wholesale",
        title: t("footer.services.title"),
        description: t("footer.services.description"),
        icon: Headphones,
        iconWrapClassName: "bg-amber-50 text-amber-600",
        iconClassName: "h-4 w-4",
      },
      {
        href: "/contact",
        title: t("footer.contact.title"),
        description: t("footer.contact.description"),
        icon: Phone,
        iconWrapClassName: "bg-rose-50 text-rose-600",
        iconClassName: "h-4 w-4",
      },
      {
        href: "/our-story",
        title: t("footer.about.title"),
        description: t("footer.about.description"),
        icon: MessageCircle,
        iconWrapClassName: "bg-violet-50 text-violet-600",
        iconClassName: "h-4 w-4",
      },
    ],
    [t],
  );

  const handleLogout = async () => {
    await signOut();
    toast.success(t("signedOut"));
    router.push("/member");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeTrackingTokenInput(token);

    if (!normalized) {
      toast.error(t("errors.emptyToken"));
      return;
    }

    router.push(`/order-tracking/${encodeURIComponent(normalized)}`);
  };

  const handleTokenChange = (value: string) => {
    setToken(formatTrackingTokenInput(value));
  };

  return (
    <MemberPortalBackground variant="light">
      <MemberHeader
        member={member}
        onLogout={() => void handleLogout()}
        theme="light"
      />

      <main className="flex min-h-[calc(100vh-16rem)] items-start justify-center px-4 pb-12 pt-16 sm:px-6 sm:pt-20">
        <div
          className={`w-full max-w-[650px] px-6 py-8 shadow-lg shadow-gray-200/80 sm:px-12 sm:py-10 ${MEMBER_PORTAL_LIGHT_ROUNDED_PANEL_CLASS}`}
        >
          <h1 className="text-center text-2xl font-semibold text-gray-900 sm:text-[28px]">
            {t("title")}
          </h1>
          <p className="mt-2.5 text-center text-sm text-gray-600">
            {t("description")}
          </p>

          <form onSubmit={handleSubmit} className="mt-10">
            <div className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-4">
              <div
                className="flex items-center justify-center text-cyan-600 sm:text-[28px]"
                aria-hidden
              >
                <KeyRound className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>

              <div className="flex-1 rounded-lg shadow-sm">
                <label htmlFor="tracking-token" className="sr-only">
                  {t("inputLabel")}
                </label>
                <input
                  id="tracking-token"
                  type="text"
                  value={token}
                  onChange={(event) => handleTokenChange(event.target.value)}
                  placeholder={t("inputPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  className={`w-full rounded-lg border border-cyan-500 bg-white px-4 py-4 font-mono text-[15px] uppercase tracking-[0.2em] text-gray-900 outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500/30 ${MEMBER_PORTAL_LIGHT_BOX_SURFACE}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-5">
              <button
                type="submit"
                className="w-full max-w-none rounded-lg bg-primary px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 sm:max-w-[240px]"
              >
                {t("submit")}
              </button>

              <div className="flex-1 sm:pt-1">
                <h2 className="text-xs font-bold text-gray-900">
                  {t("tokenHelp.title")}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                  {t("tokenHelp.description")}
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>

      <footer className="flex flex-wrap justify-center gap-5 px-4 pb-10 pt-2 sm:gap-5">
        {footerCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`flex w-full max-w-[220px] gap-4 p-5 transition-colors hover:border-gray-300 ${MEMBER_PORTAL_LIGHT_ROUNDED_PANEL_CLASS}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${card.iconWrapClassName}`}
              >
                <Icon className={card.iconClassName} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-gray-900">
                  {card.title}
                </h3>
                <p className="mt-1 text-[13px] text-gray-500">
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </footer>
    </MemberPortalBackground>
  );
}
