import Link from "@/components/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ItemFoodSafetyNotice() {
  const t = useTranslations("ItemFoodSafety");

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <Link
        href="/terms-of-service#food-safety"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red transition-colors hover:text-brand-red/80"
      >
        <ArrowRight size={14} aria-hidden />
        {t("link")}
      </Link>
      <div className="space-y-2 text-xs leading-relaxed text-brand-dark/55">
        <p>{t("hotFoodNote")}</p>
        <p>{t("boxesNote")}</p>
        <p>{t("packagingNote")}</p>
      </div>
    </div>
  );
}
