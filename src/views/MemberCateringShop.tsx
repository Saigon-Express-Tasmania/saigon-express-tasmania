"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AppImage from "@/components/AppImage";
import CateringTierSelect from "@/components/CateringTierSelect";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_BANNER_CLASS,
  MEMBER_PORTAL_CARD_HOVER_CLASS,
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
import type { UserProfile } from "@/types";
import { CheckCircle, Plus, Users, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

type MemberCateringShopProps = {
  packs: CateringPack[];
};

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function PackOrderButton({
  pack,
  selectedTier,
  onAdd,
}: {
  pack: CateringPack;
  selectedTier: CateringTierPrice | null;
  onAdd: () => void;
}) {
  const unitPrice =
    selectedTier != null
      ? parseCateringPrice(selectedTier.price)
      : parseCateringPrice(pack.price);

  if (unitPrice == null) {
    return (
      <p className="text-xs text-white/45">
        Contact us for pricing on this item.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
    >
      <Plus className="h-4 w-4" />
      Add to order
    </button>
  );
}

export default function MemberCateringShop({ packs }: MemberCateringShopProps) {
  const t = useTranslations("Catering");
  const router = useRouter();
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();
  const { addToCart } = useCateringCart();
  const [tierSelection, setTierSelection] = useState<Record<number, number>>({});

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

  const menuGroups = packs
    .filter((pack) => pack.category !== FEATURED_CATERING_PACK_CATEGORY)
    .reduce<Array<{ category: string; items: CateringPack[] }>>((groups, item) => {
      const existingGroup = groups.find((group) => group.category === item.category);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ category: item.category, items: [item] });
      }
      return groups;
    }, []);

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
      imageUrl: pack.img,
    });
  };

  if (isLoading || !isSignedIn || !me) {
    return (
      <MemberPortalBackground className="flex items-center justify-center">
        <p className="text-sm text-white/50">Loading catering shop…</p>
      </MemberPortalBackground>
    );
  }

  return (
    <MemberPortalBackground>
      <MemberHeader member={me} onLogout={() => void handleLogout()} />

      <div className={`py-6 ${MEMBER_PORTAL_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-400/30 bg-green-400/20">
              <UtensilsCrossed className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">
                Catering Shop
              </h1>
              <p className="text-sm text-white/45">
                Welcome, {me.contactName} · {me.businessName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container space-y-12 py-8 pb-16">
        <section id="packs">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("packs.label")}
            </p>
            <h2 className="font-serif text-3xl text-white md:text-4xl">
              {t("packs.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
              {t("packs.description")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {featuredPacks.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/45 md:col-span-2">
                {t("packs.empty")}
              </div>
            ) : (
              featuredPacks.map((pack) => (
                <article
                  key={pack.id}
                  className={`${MEMBER_PORTAL_CARD_HOVER_CLASS} flex h-full flex-col`}
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
                      <h3 className="font-serif text-2xl text-white">{pack.name}</h3>
                      <div className="shrink-0 text-right">
                        {pack.price ? (
                          <div className="text-sm font-bold text-primary">
                            {pack.price}
                          </div>
                        ) : null}
                        {pack.serves ? (
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-white/40">
                            <Users className="h-3 w-3" />
                            {t("packs.serves", { serves: pack.serves })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-white/60">
                      {pack.description}
                    </p>
                    <ul className="mb-5 space-y-1.5">
                      {pack.includes.map((inc, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-white/70"
                        >
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {inc}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-4">
                      <PackOrderButton
                        pack={pack}
                        selectedTier={null}
                        onAdd={() => handleAddPack(pack, null)}
                      />
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section id="catering-menu">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("menu.label")}
            </p>
            <h2 className="font-serif text-3xl text-white md:text-4xl">
              {t("menu.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/55">
              {t("menu.description")}
            </p>
          </div>

          {menuGroups.length === 0 ? (
            <div className="py-6 text-center text-sm text-white/45">
              {t("menu.empty")}
            </div>
          ) : (
            menuGroups.map((group, groupIndex) => (
              <div key={group.category}>
                <h3 className="mb-6 border-b border-white/10 pb-2 font-serif text-2xl text-white">
                  {group.category}
                </h3>
                <div
                  className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
                    groupIndex === menuGroups.length - 1 ? "mb-10" : "mb-12"
                  }`}
                >
                  {group.items.map((item) => {
                    const selectedTierIndex = tierSelection[item.id] ?? 0;
                    const selectedTier = item.prices[selectedTierIndex] ?? null;

                    return (
                      <article
                        key={item.id}
                        className={`${MEMBER_PORTAL_CARD_HOVER_CLASS} group flex h-full flex-col`}
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <AppImage
                            src={item.img ?? "/placeholder.svg"}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {item.price ? (
                            <div className="absolute right-3 top-3 bg-primary px-3 py-1 text-sm font-bold text-white">
                              {item.price}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h4 className="mb-1 font-serif text-xl text-white">
                            {item.name}
                          </h4>
                          {item.serves ? (
                            <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-primary">
                              <Users className="h-3 w-3" />
                              {t("menu.caters", { serves: item.serves })}
                            </p>
                          ) : null}
                          {item.note ? (
                            <p className="mb-2 text-xs italic text-white/50">
                              {item.note}
                            </p>
                          ) : null}
                          {item.includes.length > 0 ? (
                            <ul className="mb-4 space-y-1">
                              {item.includes.map((inc, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-1.5 text-xs text-white/65"
                                >
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                  {inc}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="mt-auto flex flex-col gap-3 pt-4">
                            {item.prices.length > 0 ? (
                              <CateringTierSelect
                                id={`member-catering-tier-${item.id}`}
                                tiers={item.prices}
                                value={selectedTierIndex}
                                onValueChange={(index) =>
                                  setTierSelection((prev) => ({
                                    ...prev,
                                    [item.id]: index,
                                  }))
                                }
                                label={t("menu.sizeLabel")}
                                variant="dark"
                              />
                            ) : null}
                            <PackOrderButton
                              pack={item}
                              selectedTier={selectedTier}
                              onAdd={() => handleAddPack(item, selectedTier)}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("menu.proteinLabel")}
            </p>
            <p className="text-sm text-white/80">{t("menu.proteinList")}</p>
            <p className="mt-2 text-xs text-white/50">{t("menu.proteinNote")}</p>
          </div>
        </section>
      </div>
    </MemberPortalBackground>
  );
}
