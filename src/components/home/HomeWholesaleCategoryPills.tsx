import Link from "@/components/link";
import { getRandomCategoriesByKind } from "@/lib/supabase/categories";

export default async function HomeWholesaleCategoryPills() {
  const wholesaleContents = await getRandomCategoriesByKind("wholesale", 6);

  if (wholesaleContents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {wholesaleContents.map((content) => (
        <Link
          key={`wholesale-category-${content.id}`}
          className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/20 text-white/70 text-xs font-medium"
          href={`/wholesale/landing-shop?category=${encodeURIComponent(content.name)}`}
        >
          {content.name}
        </Link>
      ))}
    </div>
  );
}
