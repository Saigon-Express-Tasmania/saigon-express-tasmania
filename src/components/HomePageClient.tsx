"use client";

import { trpc } from "@/lib/trpc";
import type { FeaturedReview } from "@/types";
import Home from "@/views/Home";

type HomePageClientProps = {
  featuredReviews: FeaturedReview[];
};

export default function HomePageClient({ featuredReviews }: HomePageClientProps) {
  const { data: menuItems } = trpc.public.menu.useQuery();
  return (
    <Home menuItems={menuItems ?? []} featuredReviews={featuredReviews} />
  );
}
