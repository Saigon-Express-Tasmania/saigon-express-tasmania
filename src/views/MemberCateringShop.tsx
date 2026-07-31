"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import AppImage from "@/components/AppImage";
import CateringMenuCatalog from "@/components/CateringMenuCatalog";
import CateringPackOrderButton from "@/components/CateringPackOrderButton";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_LIGHT_BANNER_CLASS,
  MEMBER_PORTAL_LIGHT_CARD_HOVER_CLASS,
} from "@/lib/member-portal-surfaces";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import { parseCateringPrice } from "@/lib/catering-price";
import { resolvePortalType } from "@/lib/privileges";
import {
  FEATURED_CATERING_PACK_CATEGORY,
  type CateringPack,
  type CateringTierPrice,
} from "@/lib/supabase/catering-packs";
import type { SiteCategory, SiteCategoryGroup, UserProfile } from "@/types";
import { CheckCircle, Users, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

type MemberCateringShopProps = {
  packs: CateringPack[];
  categoriesContent: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  barCategories: SiteCategory[];
  activeCategoryId: number | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  initialSearch: string;
};

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export default function MemberCateringShop({
  packs,
  categoriesContent,
  categoryGroups,
  barCategories,
  activeCategoryId,
  page,
  pageSize,
  totalCount,
  totalPages,
  initialSearch,
}: MemberCateringShopProps) {
  const t = useTranslations("Catering");
  const locale = useLocale();
  const router = useRouter();
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();
  const { addToCart } = useCateringCart();

  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getContactName(profile),
      contactName: getContactName(profile),
      portalType: resolvePortalType(authMetadata.privileges),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.push("/member");
    }
  }, [isLoading, isSignedIn, router]);

  const featuredPacks = packs.filter(
    (pack) => pack.category === FEATURED_CATERING_PACK_CATEGORY,
  );

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const handleAddPack = (
    pack: CateringPack,
    tier: CateringTierPrice | null,
  ) => {
    const unitPrice =
      tier != null
        ? parseCateringPrice(tier.price)
        : parseCateringPrice(pack.price);

    if (unitPrice == null) {
      toast.error("This item requires a custom quote. Please contact catering.");
      return;
    }

    addToCart({
      productId: pack.id,
      productName: pack.name,
      variantLabel: tier?.size ?? null,
      unitPrice,
      catalogUnitPrice: pack.catalogUnitPrice,
      imageUrl: pack.img,
    });
  };

  if (isLoading || !isSignedIn || !me) {
    return (
      <MemberPortalBackground
        variant="light"
        className="flex items-center justify-center"
      >
        <p className="text-sm text-gray-500">Loading catering shop…</p>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-600/30 bg-green-50">
              <UtensilsCrossed className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">
                Catering Shop
              </h1>
              <p className="text-sm text-gray-500">
                Welcome, {me.contactName} · {me.businessName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="container space-y-12 py-8">
        <section id="packs">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("packs.label")}
            </p>
            <h2 className="font-serif text-3xl text-gray-900 md:text-4xl">
              {t("packs.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
              {t("packs.description")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {featuredPacks.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500 md:col-span-2">
                {t("packs.empty")}
              </div>
            ) : (
              featuredPacks.map((pack) => (
                <article
                  key={pack.id}
                  className={`${MEMBER_PORTAL_LIGHT_CARD_HOVER_CLASS} flex h-full flex-col`}
                >
                  <div className="relative aspect-[16/7] overflow-hidden">
                    <AppImage
                      src={pack.img ?? "/placeholder.svg"}
                      alt={pack.name}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    {pack.tag ? (
                      <span
                        className={`absolute left-4 top-4 ${pack.tagBg} px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white`}
                      >
                        {pack.tag}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <h3 className="font-serif text-2xl text-gray-900">{pack.name}</h3>
                      <div className="shrink-0 text-right">
                        {pack.price ? (
                          <div className="text-sm font-bold text-primary">
                            {pack.price}
                          </div>
                        ) : null}
                        {pack.serves ? (
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            {t("packs.serves", { serves: pack.serves })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">
                      {pack.description}
                    </p>
                    <ul className="mb-5 space-y-1.5">
                      {pack.includes.map((inc, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-gray-700"
                        >
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {inc}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-4">
                      <CateringPackOrderButton
                        pack={pack}
                        selectedTier={null}
                        onAdd={() => handleAddPack(pack, null)}
                        orderLabel={t("packs.addToOrder")}
                        quoteLabel={t("packs.quoteRequired")}
                      />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div> */}

      <section id="catering-menu" className="bg-white py-4 pb-16">
        {/* <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            {t("menu.label")}
          </p>
          <h2 className="font-serif text-4xl text-brand-dark">
            {t("menu.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-brand-dark/55">
            {t("menu.description")}
            {t("menu.descriptionEnd")}
          </p>
        </div> */}

        <CateringMenuCatalog
          packs={packs}
          categoriesContent={categoriesContent}
          categoryGroups={categoryGroups}
          barCategories={barCategories}
          activeCategoryId={activeCategoryId}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          initialSearch={initialSearch}
          onAddToOrder={handleAddPack}
          locale={locale}
        />
      </section>
    </MemberPortalBackground>
  );
}
