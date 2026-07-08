import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { getCategoryCatalogByKind } from "@/lib/supabase/categories";
import { CATERING_CATEGORIES_ANCHOR } from "@/lib/catering-item-routes";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

const CATERING_GRID_LIMIT = 8;
const FALLBACK_IMAGE = "/placeholder.svg";
const GRID_IMAGE_SIZES = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 16vw";

type CateringGridCell = {
  groupId: number;
  name: string;
  image: string;
  href: string;
};

async function getCateringGridCells(): Promise<CateringGridCell[]> {
  const { categories, categoryGroups } = await getCategoryCatalogByKind(
    "catering",
  );

  return categoryGroups
    .map((group) => {
      // `categories` are pre-sorted by display order, so the first match is the
      // lowest sort_order category within the group.
      const firstCategory = categories.find(
        (category) => category.categoryGroupId === group.id,
      );
      if (!firstCategory) return null;

      const cell: CateringGridCell = {
        groupId: group.id,
        name: group.name,
        image: group.imageUrl ?? firstCategory.imageUrl ?? FALLBACK_IMAGE,
        href: `/catering?category=${encodeURIComponent(
          firstCategory.alias,
        )}#${CATERING_CATEGORIES_ANCHOR}`,
      };
      return cell;
    })
    .filter((cell): cell is CateringGridCell => cell !== null)
    .slice(0, CATERING_GRID_LIMIT);
}

export default async function HomeCateringSection() {
  const t = await getTranslations("Home");
  const cells = await getCateringGridCells();

  return (
    <section
      className="py-12 lg:py-20"
      style={{
        background:
          "linear-gradient(135deg, #1a0a00 0%, #2d0f00 40%, #1a0a00 100%)",
      }}
    >
      <div className="mx-auto px-16">
        <div className="reveal">
          <span className="section-label">{t("catering.label")}</span>
          <h2 className="font-serif text-4xl md:text-5xl text-white mt-3 mb-5">
            {t("catering.titleLine1")}
            <br />
            <span className="text-brand-red italic">
              {t("catering.titleLine2")}
            </span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-6">
            {t("catering.description")}
          </p>          
        </div>

        {cells.length > 0 ? (
          <div
            className="reveal mt-12 mb-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-5"
            style={{ animationDelay: "0.15s" }}
          >
            {cells.map((cell) => (
              <Link
                key={`catering-group-${cell.groupId}`}
                href={cell.href}
                className="group flex flex-col items-center text-center"
              >
                <div className="relative w-full aspect-square rounded-xl border-2 border-[#574635] bg-[#1a1a1a] p-1 overflow-hidden">
                  <div className="relative w-full h-full overflow-hidden rounded-lg">
                    <AppImage
                      src={cell.image}
                      alt={cell.name}
                      fill
                      sizes={GRID_IMAGE_SIZES}
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
                <span className="mt-3 text-xs font-bold uppercase tracking-wide leading-tight text-white group-hover:text-brand-red transition-colors">
                  {cell.name}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

<Link href="/catering" className="btn-red">
            {t("catering.cta")} <ChevronRight size={16} />
          </Link>
      </div>
    </section>
  );
}
