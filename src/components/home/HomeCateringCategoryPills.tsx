import Link from "@/components/link";
import { getRandomCategoriesByKind } from "@/lib/supabase/categories";

export default async function HomeCateringCategoryPills() {
  const cateringContents = await getRandomCategoriesByKind("catering", 6);

  if (cateringContents.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {cateringContents.map((category) => (
        <Link
          key={`catering-category-${category.id}`}
          className="pill-tag"
          href={`/catering#${category.alias}`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
