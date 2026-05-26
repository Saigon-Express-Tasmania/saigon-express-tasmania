"use client";

import type { FeaturedReview } from "@/types";
import type { MenuItem } from "@/contexts/CartContext";
import Home from "@/views/Home";

type HomePageClientProps = {
  featuredReviews: FeaturedReview[];
  menuItems: MenuItem[];
};

export default function HomePageClient({ featuredReviews, menuItems }: HomePageClientProps) {
  return (
    <Home menuItems={menuItems ?? []} featuredReviews={featuredReviews} />
  );
}
