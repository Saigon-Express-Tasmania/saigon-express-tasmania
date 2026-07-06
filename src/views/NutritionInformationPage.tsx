import AllergenKeyBadge from "@/components/nutrition/AllergenKeyBadge";
import DietGuideCard from "@/components/nutrition/DietGuideCard";
import NutritionDishFinder from "@/components/nutrition/NutritionDishFinder";
import NutritionFaqSection from "@/components/nutrition/NutritionFaqSection";
import {
  nutritionAllergenKeyItems,
  nutritionDietGuideCards,
} from "@/lib/nutrition-palette";

const NUTRITION_PDF = "/documents/SaigonExpress_Nutritional_Information.pdf";
const ALLERGEN_PDF = "/documents/SaigonExpress_Dietary_Allergen_Guide.pdf";

function SectionEyebrow({
  children,
  variant = "light",
}: {
  children: React.ReactNode;
  variant?: "light" | "dark";
}) {
  const accent = variant === "dark" ? "text-brand-amber" : "text-brand-red";
  const bar = variant === "dark" ? "bg-brand-amber" : "bg-brand-red";

  return (
    <p
      className={`flex items-center gap-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.22em] ${accent}`}
    >
      <span className={`h-0.5 w-[26px] ${bar}`} />
      {children}
    </p>
  );
}

function HeroWave() {
  return (
    <svg
      className="-mt-px block h-11 w-full text-brand-cream"
      viewBox="0 0 1440 44"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0,44 L0,20 C240,44 480,0 720,14 C960,28 1200,44 1440,10 L1440,44 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function NutritionInformationPage({
  locale: _locale,
}: {
  locale: string;
}) {
  return (
    <div className="bg-brand-cream font-sans text-brand-dark">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-[#a50d25] to-brand-red px-0 pb-[74px] pt-8 text-white md:pt-[34px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_0%,rgba(200,16,46,0.22),transparent_60%)]" />

        <div className="relative z-[2] mx-auto max-w-[1120px] px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-amber/40 px-4 py-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-brand-amber">
            🌿 Fresh · Healthy · Vietnamese
          </div>

          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.6rem,6.4vw,5rem)] font-black leading-[1.05] tracking-[-0.015em]">
            Nutrition, Dietary &amp;
            <br />
            <span className="font-serif font-semibold italic text-brand-amber">
              Allergen
            </span>{" "}
            Information
          </h1>

          <p className="mt-2.5 max-w-[640px] text-[clamp(1rem,1.6vw,1.22rem)] font-light leading-relaxed text-white/80">
            With an option for everyone, Saigon Express brings a little piece of
            Vietnam to Hobart — and it&apos;s one of the healthiest cuisines in
            the world. Explore our vegetarian, vegan, halal-suitable and
            allergy-friendly choices below.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            {[
              { value: "50+", label: "Veg & Vegan dishes" },
              { value: "14", label: "Allergens tracked" },
              { value: "200+", label: "Dishes on the menu" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="min-w-[120px] rounded-[14px] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm"
              >
                <div className="font-serif text-[1.9rem] font-black leading-none text-brand-amber">
                  {stat.value}
                </div>
                <div className="mt-1 text-[0.76rem] uppercase tracking-[0.05em] text-white/70">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HeroWave />

      <section className="bg-brand-cream pb-16 pt-5 md:pb-[66px] md:pt-5">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionEyebrow>Something for everyone</SectionEyebrow>
          <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.9rem)] font-black leading-tight text-brand-red">
            Find what suits you
          </h2>
          <p className="mt-2 mb-9 max-w-[640px] font-light text-stone-600">
            Whether you&apos;re plant-based, avoiding an allergen, or looking for
            halal-suitable options — we&apos;ve got a fresh Vietnamese dish for
            you. Jump to a guide or use the live finder below.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {nutritionDietGuideCards.map((card) => (
              <DietGuideCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <NutritionDishFinder />

      <section className="bg-gradient-to-br from-brand-dark to-[#a50d25] py-16 text-white md:py-[66px]">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionEyebrow variant="dark">The good oil</SectionEyebrow>
          <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.9rem)] font-black leading-tight text-white">
            Full guides to download
          </h2>
          <p className="mt-2 mb-9 max-w-[640px] font-light text-white/75">
            For the complete picture — every dish, every number — grab our
            printable PDF guides.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            {[
              {
                href: NUTRITION_PDF,
                icon: "kJ",
                title: "Nutritional Information",
                description:
                  "Energy, protein, fat, carbs, sugars & sodium for every dish on the menu.",
              },
              {
                href: ALLERGEN_PDF,
                icon: "✓",
                title: "Dietary & Allergen Guide",
                description:
                  "Full allergen matrix plus vegetarian, vegan, halal & low-gluten lists.",
              },
            ].map((guide) => (
              <a
                key={guide.title}
                href={guide.href}
                download
                className="flex items-center gap-5 rounded-[18px] border border-white/15 bg-white/5 p-7 text-white no-underline transition-all hover:-translate-y-1 hover:bg-white/10"
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[14px] bg-brand-amber font-serif text-[1.6rem] font-black text-brand-dark">
                  {guide.icon}
                </div>
                <div>
                  <h3 className="font-serif text-[1.3rem] font-semibold">
                    {guide.title}
                  </h3>
                  <p className="mt-1 text-[0.85rem] font-light text-white/75">
                    {guide.description}
                  </p>
                  <div className="mt-2 text-[0.76rem] font-semibold tracking-wide text-brand-amber">
                    ↓ Download PDF
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-cream py-16 md:py-[66px]">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionEyebrow>Know your allergens</SectionEyebrow>
          <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.9rem)] font-black leading-tight text-brand-red">
            The 14 we track
          </h2>
          <p className="mt-2 mb-5 max-w-[640px] font-light text-stone-600">
            We monitor these common allergens across our menu. A blank on our
            guide doesn&apos;t guarantee an item is free of that allergen —
            always tell our team about your needs.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-x-3.5 gap-y-10 sm:grid-cols-4 lg:grid-cols-7">
            {nutritionAllergenKeyItems.map((item) => (
              <div key={item.label} className="text-center">
                <AllergenKeyBadge src={item.src} variant={item.variant} />
                <span className="block text-[0.875rem] font-semibold leading-snug text-brand-dark">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white py-16 md:py-[66px]">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="rounded-r-[14px] border-l-4 border-brand-red bg-brand-red/5 px-7 py-6 text-[0.9rem] leading-relaxed text-brand-dark">
            <p>
              <strong className="text-brand-red">Please read:</strong> At Saigon
              Express we believe everyone deserves to enjoy fresh, healthy
              Vietnamese food, which is why we proudly offer vegan, vegetarian
              and gluten-friendly options. To help us serve you better, please{" "}
              <strong>
                let our staff know about any specific dietary requirements or
                allergies before ordering
              </strong>
              . While we always take great care in food preparation, our kitchen
              is <strong>not completely allergen-free</strong> — there is a
              small risk of cross-contact with ingredients such as nuts, sesame,
              eggs, gluten and dairy. A blank space in our guides means an
              allergen was not reported by our suppliers and kitchen assessment,
              but is not a guarantee. Nutritional values are averages and may
              vary with portion size, preparation and optional extras.
              Halal-suitable options are offered at our Sandy Bay store only.
              Your wellbeing matters to us — our team is happy to guide you to a
              safe and enjoyable meal.
            </p>
          </div>
        </div>
      </section>

      <NutritionFaqSection />
    </div>
  );
}
