import LazyImage from "@/components/LazyImage";
import Link from "@/components/link";
import { getMenuItems } from "@/lib/supabase/menu";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

const FALLBACK_IMAGES = [
  "/manus-storage/banh-mi-2_7d02846f.jpg",
  "/manus-storage/pho-2_4fc44f9f.jpg",
  "/manus-storage/spring-rolls-1_02f22814.jpg",
  "/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg",
] as const;

export default async function HomeBestSellersSection() {
  const [t, menuItems] = await Promise.all([
    getTranslations("Home"),
    getMenuItems(),
  ]);

  const bestSellers = menuItems
    .filter((item) => Boolean(item.isAvailable) && Boolean(item.isPopular))
    .slice(0, 4);

  if (bestSellers.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-end justify-between mb-10 reveal">
          <div>
            <span className="section-label">{t("bestSellers.label")}</span>
            <h2 className="font-serif text-4xl text-brand-dark mt-2">
              {t("bestSellers.title")}
            </h2>
          </div>
          <Link
            href="/menu"
            className="text-sm font-semibold text-brand-red hover:underline flex items-center gap-1"
          >
            {t("bestSellers.seeFullMenu")} <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestSellers.map((item, i) => (
            <Link
              key={item.id}
              href="/menu"
              className="group block bg-brand-cream rounded-sm overflow-hidden card-lift reveal"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                <LazyImage
                  src={item.imageUrl ?? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]}
                  alt={item.name}
                  wrapperClassName="w-full h-full"
                  className="group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-1">
                  {item.category}
                </p>
                <h3 className="font-serif text-lg text-brand-dark leading-tight mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-brand-dark/60 line-clamp-2 mb-3">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-dark">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-brand-red font-semibold">
                    {t("bestSellers.order")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
