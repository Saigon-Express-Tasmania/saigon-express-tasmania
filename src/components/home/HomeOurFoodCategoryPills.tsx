import Link from "@/components/link";
import { getRandomCategoriesByKind } from "@/lib/supabase/categories";

export default async function HomeOurFoodCategoryPills() {
  const categoryContents = await getRandomCategoriesByKind("menu", 6);

  if (categoryContents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {categoryContents.map((category) => (
        <Link
          key={`ourfood-category-${category.id}`}
          className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase text-white border border-white/20 bg-white/10"
          href={`/menu?category=${encodeURIComponent(category.name)}`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
