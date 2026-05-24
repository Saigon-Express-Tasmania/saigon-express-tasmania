"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Clock, ChevronRight, Sparkles } from "lucide-react";
import { ShareDealButton } from "@/components/ShareDealButton";
import { SITE_ORIGIN } from "@/lib/site-origin";

const LOGO_URL = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";
const FALLBACK_IMG = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";

function PromotionCard({ promo }: { promo: {
  id: number;
  title: string;
  description: string | null;
  badge: string | null;
  discountLabel: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  expiresAt: Date | null;
} }) {
  const [imageSrc, setImageSrc] = useState(promo.imageUrl ?? FALLBACK_IMG);
  const isExternal = promo.ctaHref?.startsWith("http");
  const expiresLabel = promo.expiresAt
    ? `Expires ${new Date(promo.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const cta = (
    <Button className="bg-red-700 hover:bg-red-800 text-white w-full sm:w-auto gap-1.5">
      {promo.ctaLabel ?? "Order Now"}
      <ChevronRight className="w-4 h-4" />
    </Button>
  );

  // Build a URL-safe slug from the title for anchor linking
  const slug = promo.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const dealUrl = `${SITE_ORIGIN}/promotions#${slug}`;

  return (
    <Card id={slug} className="overflow-hidden border-0 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors group">
      <div className="relative h-48 overflow-hidden">
        <AppImage
          src={imageSrc}
          alt={promo.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImageSrc(FALLBACK_IMG)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {promo.discountLabel && (
          <div className="absolute top-3 right-3 bg-yellow-400 text-black font-black text-sm px-3 py-1 rounded-full shadow-lg">
            {promo.discountLabel}
          </div>
        )}
        {promo.badge && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-red-700 text-white border-0 text-xs font-semibold">
              <Tag className="w-3 h-3 mr-1" />
              {promo.badge}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-5 space-y-3">
        <h3 className="text-white font-bold text-lg leading-snug">{promo.title}</h3>
        {promo.description && (
          <p className="text-white/70 text-sm leading-relaxed">{promo.description}</p>
        )}
        {expiresLabel && (
          <div className="flex items-center gap-1.5 text-yellow-400/80 text-xs">
            <Clock className="w-3.5 h-3.5" />
            {expiresLabel}
          </div>
        )}
        <div className="pt-1 flex flex-wrap items-center gap-2">
          {isExternal ? (
            <a href={promo.ctaHref!} target="_blank" rel="noopener noreferrer">{cta}</a>
          ) : (
            <Link href={promo.ctaHref ?? "/menu"}>{cta}</Link>
          )}
          <ShareDealButton
            title={promo.title}
            description={promo.description}
            url={dealUrl}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PromotionSkeleton() {
  return (
    <Card className="overflow-hidden border-0 bg-white/5">
      <Skeleton className="h-48 w-full rounded-none bg-white/10" />
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-white/10" />
        <Skeleton className="h-4 w-full bg-white/10" />
        <Skeleton className="h-4 w-2/3 bg-white/10" />
        <Skeleton className="h-9 w-28 bg-white/10 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function Promotions() {
  const { data: promos, isLoading, isError } = trpc.promotions.list.useQuery();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#6b1010] via-[#4a0c0c] to-[#2d0808]">
      {/* Navbar spacer */}
      <div className="h-16" />

      {/* Hero */}
      <section className="relative py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_white_1px,_transparent_1px)] bg-[length:32px_32px]" />
        </div>
        <div className="relative max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm font-semibold tracking-widest uppercase">
            <Sparkles className="w-4 h-4" />
            Exclusive Deals
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Current Promotions
          </h1>
          <p className="text-white/70 text-lg">
            Fresh deals, loyalty rewards, and app-exclusive offers — updated regularly.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express"
              width={180}
              height={40}
              priority
              className="h-10 w-auto object-contain opacity-80"
            />
          </div>
        </div>
      </section>

      {/* Promotions grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        {isError && (
          <div className="text-center py-16 text-white/60">
            <p className="text-lg">Unable to load promotions right now. Please try again later.</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <PromotionSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && promos && promos.length === 0 && (
          <div className="text-center py-20 text-white/60">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-xl font-semibold text-white/80">No active promotions right now</p>
            <p className="mt-2">Check back soon — new deals drop regularly!</p>
            <Link href="/menu">
              <Button className="mt-6 bg-red-700 hover:bg-red-800 text-white">
                Browse the Menu
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isError && promos && promos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promos.map((promo: ComponentProps<typeof PromotionCard>["promo"]) => (
              <PromotionCard key={promo.id} promo={promo} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/10 py-12 px-4 text-center">
        <p className="text-white/60 text-sm mb-4">
          Want to be the first to know about new deals?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/#get-the-sg-app">
            <Button className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold gap-2">
              <Sparkles className="w-4 h-4" />
              Get the App for App-Only Deals
            </Button>
          </Link>
          <Link href="/menu">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
              Browse the Menu
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
