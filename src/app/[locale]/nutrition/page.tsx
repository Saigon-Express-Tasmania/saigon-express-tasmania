import type { Metadata } from "next";
import NutritionInformationPage from "@/views/NutritionInformationPage";

export const metadata: Metadata = {
  title: "Nutrition, Dietary & Allergen Information",
  description:
    "Fresh, healthy, authentic Vietnamese food in Hobart. Find our vegetarian, vegan, halal-suitable and allergen-friendly options, plus full nutritional guides.",
};

export default async function LocaleNutritionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <NutritionInformationPage locale={locale} />;
}