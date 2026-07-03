"use client";

import {
  ChevronRight,
  MapPin,
  Users,
  Mail,
  Briefcase,
  Star,
  Heart,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { useFormattedContactPhone } from "@/hooks/useFormattedContactPhone";
import Jobs from "@/components/Jobs";
import JobApplicationForm from "@/components/JobApplicationForm";
import type { JobListing } from "@/types/JobListing";
import Image from "next/image";

const BENEFITS_CONFIG = [
  { icon: Star, key: "discount" },
  { icon: Zap, key: "progression" },
  { icon: Heart, key: "culture" },
  { icon: Users, key: "events" },
  { icon: Briefcase, key: "training" },
  { icon: MapPin, key: "locations" },
];

export default function Careers({ jobs }: { jobs: JobListing[] }) {
  const t = useTranslations("Careers");
  const contactEmail = useSiteSetting("contact_us_email")?.trim();
  const contactPhone = useFormattedContactPhone();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative min-h-[52vh] overflow-hidden py-16 md:py-20 lg:py-24">
        <Image
            src="/manus-storage/careers__hero.png"
            alt={t("hero.titleLine1")}
            fill
            priority
            className="absolute inset-0 object-cover object-[50%_45%] w-full h-full"
          />
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative flex flex-col items-center justify-center text-right px-6 mt-30 h-fit max-h-[300px]">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block text-xs font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full mb-5 text-white border border-white/30 bg-white/10 backdrop-blur-sm">
              {t("hero.badge")}
            </div>
            <h1 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-5 leading-tight">
              {t("hero.titleLine1")}
              <br />
              <span style={{ color: "oklch(71% 0.155 62)" }}>
                {t("hero.titleLine2")}
              </span>
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              {t("hero.description")}
            </p>
            <a href="#positions">
              <button className="flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors mx-auto">
                {t("hero.cta")} <ChevronRight className="w-4 h-4" />
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Why work with us */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <div
              className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "oklch(71% 0.155 62)" }}
            >
              {t("whyUs.label")}
            </div>
            <h2 className="font-serif text-4xl font-bold text-foreground">
              {t("whyUs.title")}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              {t("whyUs.description")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS_CONFIG.map((b) => (
              <div
                key={b.key}
                className="flex gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">
                    {t(`whyUs.benefits.${b.key}.title`)}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {t(`whyUs.benefits.${b.key}.desc`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extracted Interactive Jobs Component seamlessly reading the raw array values */}
      <Jobs jobs={jobs} />

      
      {/* CTA — dark section */}
      <section className="py-20 bg-[#1A1A1A] text-white">
        <div className="container text-center">
          <div
            className="text-xs font-bold tracking-[0.2em] uppercase mb-4"
            style={{ color: "oklch(71% 0.155 62)" }}
          >
            {t("cta.label")}
          </div>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-5">
            {t("cta.titleLine1")}
            <br />
            {t("cta.titleLine2")}
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-10">
            {t("cta.description")}
          </p>
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {contactEmail ? (
              <a
                href={`mailto:${contactEmail}?subject=Job Application — Saigon Express Tasmania`}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-base"
              >
                <Mail className="w-5 h-5" /> {t("cta.emailBtn")}
              </a>
            ) : null}
            {contactEmail ? (
              <div className="text-white/50 text-sm">
                <div className="font-medium text-white/80">{contactEmail}</div>
                <div className="text-xs mt-0.5">
                  {contactPhone
                    ? t("cta.smsLabel", { phone: contactPhone.display })
                    : null}
                </div>
              </div>
            ) : null}
          </div> */}
        </div>
      </section>

      <JobApplicationForm
        jobs={jobs.map((job) => ({
          id: job.id,
          title: job.title,
          location: job.location,
          salary: job.salary,
        }))}
      />
    </div>
  );
}
