"use client";

import { trpc } from "@/lib/trpc";
import Home from "@/views/Home";

export default function LocaleHomePage() {
  const { data: menuItems } = trpc.public.menu.useQuery();
  return <Home menuItems={menuItems ?? []} />;
}
