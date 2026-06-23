"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  DollarSign,
  Briefcase,
  Mail,
} from "lucide-react";
import type { JobListing } from "@/types/JobListing";

export default function Jobs({ jobs }: { jobs: JobListing[] }) {
  const t = useTranslations("Jobs");
  const contactEmail = useSiteSetting("contact_us_email")?.trim();

  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [filterDept, setFilterDept] = useState(t("filterAll"));

  const filterAllLabel = t("filterAll");

  const departments = [
    filterAllLabel,
    ...Array.from(new Set(jobs.map((j) => j.department))),
  ];

  const filtered =
    filterDept === filterAllLabel
      ? jobs
      : jobs.filter((j) => j.department === filterDept);

  return (
    <section id="positions" className="py-20 bg-[#F5F0E8]">
      <div className="container">
        {/* Section heading */}
        <div className="text-center mb-10">
          <div
            className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: "oklch(71% 0.155 62)" }}
          >
            {t("sectionLabel")}
          </div>
          <h2 className="font-serif text-4xl font-bold text-foreground">
            {t("heading")}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            {t("subheading", { count: jobs.length })}
          </p>
        </div>

        {/* Department filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDept(d)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filterDept === d
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-foreground/70 border border-border hover:border-primary/40"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Job header */}
              <button
                className="w-full text-left p-6 flex items-start justify-between gap-4"
                onClick={() =>
                  setExpandedJob(expandedJob === job.id ? null : job.id)
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {job.badge && (
                      <span
                        className={`text-xs font-bold tracking-wider px-2.5 py-0.5 rounded-full text-white ${job.badgeColor}`}
                      >
                        {job.badge}
                      </span>
                    )}
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                      {job.department}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-3">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> {job.type}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> {job.salary}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  {expandedJob === job.id ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence>
                {expandedJob === job.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 border-t border-border pt-5">
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        {job.summary}
                      </p>

                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* Responsibilities */}
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                            {t("keyResponsibilities")}
                          </h4>
                          <ul className="space-y-2">
                            {job.responsibilities.map((r, ri) => (
                              <li
                                key={ri}
                                className="text-sm text-muted-foreground flex gap-2"
                              >
                                <span className="text-primary mt-0.5 flex-shrink-0">
                                  ›
                                </span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Requirements + Perks */}
                        <div>
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            {t("lookingFor")}
                          </h4>
                          <ul className="space-y-2 mb-5">
                            {job.requirements.map((r, ri) => (
                              <li
                                key={ri}
                                className="text-sm text-muted-foreground flex gap-2"
                              >
                                <span className="text-amber-500 mt-0.5 flex-shrink-0">
                                  ›
                                </span>
                                {r}
                              </li>
                            ))}
                          </ul>
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            {t("perksAndBenefits")}
                          </h4>
                          <ul className="space-y-2">
                            {job.perks.map((p, pi) => (
                              <li
                                key={pi}
                                className="text-sm text-muted-foreground flex gap-2"
                              >
                                <span className="text-emerald-500 mt-0.5 flex-shrink-0">
                                  ✓
                                </span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Apply CTA */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                        <a
                          href={`?job=${job.id}#apply`}
                          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
                        >
                          <Mail className="w-4 h-4" />
                          {t("applyButton")}
                        </a>
                        {contactEmail ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-4 py-2.5">
                            {t("applyFootnote")}{" "}
                            <a
                              href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                                t("emailSubject", { jobTitle: job.title }),
                              )}&body=${t("emailBody", { jobTitle: encodeURIComponent(job.title) })}`}
                              className="font-semibold text-foreground hover:text-primary"
                            >
                              {contactEmail}
                            </a>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
