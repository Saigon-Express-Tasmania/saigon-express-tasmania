"use client";

import { useState } from "react";
import { nutritionFaqItems } from "@/lib/nutrition-palette";

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-brand-red">
      <span className="h-0.5 w-[26px] bg-brand-red" />
      {children}
    </p>
  );
}

function FaqAnswer({
  answer,
  highlight,
}: {
  answer: string;
  highlight?: string;
}) {
  if (!highlight) {
    return <>{answer}</>;
  }

  const [before, after] = answer.split(highlight);
  return (
    <>
      {before}
      <strong className="font-semibold text-brand-dark">{highlight}</strong>
      {after}
    </>
  );
}

export default function NutritionFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 bg-brand-cream py-16 md:py-[66px]">
      <div className="mx-auto max-w-[1120px] px-6">
        <SectionEyebrow>Good to know</SectionEyebrow>
        <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.9rem)] font-black leading-tight text-brand-red">
          Frequently asked questions
        </h2>

        <div className="mt-6 max-w-[820px]">
          {nutritionFaqItems.map((item, index) => {
            const open = openIndex === index;
            const highlight =
              "highlight" in item ? item.highlight : undefined;

            return (
              <div
                key={item.question}
                className="mb-3 overflow-hidden rounded-xl border border-stone-200 bg-white"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-[18px] text-left transition-colors hover:bg-brand-cream/80 md:px-[22px]"
                >
                  <span className="text-base font-semibold text-brand-dark">
                    {item.question}
                  </span>
                  <span
                    className={`shrink-0 text-[1.3rem] leading-none text-brand-red transition-transform duration-200 ${
                      open ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                {open ? (
                  <div className="px-5 pb-5 text-[0.95rem] leading-relaxed text-stone-600 md:px-[22px] md:pb-5">
                    <FaqAnswer answer={item.answer} highlight={highlight} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
