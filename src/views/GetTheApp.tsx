"use client";

import AppImage from "@/components/AppImage";
import { motion } from "framer-motion";
import {
  Smartphone,
  Zap,
  Star,
  MapPin,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";

const APP_URL = "https://www.saigonexpress.com.au/get-the-app";

const ICON_MAP: Record<string, React.ElementType> = {
  Zap,
  Star,
  MapPin,
  Smartphone,
};

type Step = { num: string; text: string };
type Benefit = { icon: string; title: string; desc: string };

function StepCard({ step }: { step: Step }) {
  const isCheck = step.num === "✓";
  const isWarn = step.num === "!";
  return (
    <div
      className={`flex gap-4 p-4 rounded-xl border ${
        isCheck
          ? "border-green-200 bg-green-50"
          : isWarn
            ? "border-amber-200 bg-amber-50"
            : "border-border bg-card"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          isCheck
            ? "bg-green-500 text-white"
            : isWarn
              ? "bg-amber-400 text-white"
              : "bg-primary text-white"
        }`}
      >
        {step.num}
      </div>
      <p className="text-sm text-foreground leading-relaxed pt-1">
        {step.text}
      </p>
    </div>
  );
}

type InstallColumnProps = {
  emoji: string;
  label: string;
  meta: string;
  steps: Step[];
  delay: number;
};

function InstallColumn({
  emoji,
  label,
  meta,
  steps,
  delay,
}: InstallColumnProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div
        className="p-5 border-b border-border"
        style={{ background: "oklch(13% 0.008 30)" }}
      >
        <div className="text-2xl mb-1">{emoji}</div>
        <div className="font-bold text-white">{label}</div>
        <div className="text-xs text-white/50 mt-1">{meta}</div>
      </div>
      <div className="p-5 space-y-3">
        {steps.map((s, i) => (
          <StepCard key={i} step={s} />
        ))}
      </div>
    </motion.div>
  );
}

export default function GetTheApp() {
  const t = useTranslations("GetTheApp");
  const [copied, setCopied] = useState(false);

  // Array resolution — t.raw() per project standard
  const benefits = t.raw("benefits") as Benefit[];
  const stepsIosSafari = t.raw("stepsIosSafari") as Step[];
  const stepsIosFirefox = t.raw("stepsIosFirefox") as Step[];
  const stepsAndroid = t.raw("stepsAndroid") as Step[];

  const copyLink = () => {
    navigator.clipboard.writeText(APP_URL).then(() => {
      setCopied(true);
      toast.success(t("share.toastSuccess"));
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    t("share.whatsappMessage", { appUrl: APP_URL }),
  )}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="py-20 text-center"
        style={{ background: "oklch(13% 0.008 30)" }}
      >
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AppImage
              src={LOGO_URL}
              alt={t("hero.logoAlt")}
              width={LOGO_INTRINSIC.width}
              height={LOGO_INTRINSIC.height}
              priority
              className={`h-16 ${LOGO_IMG_CLASS} mx-auto mb-6`}
            />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-white/60 mb-6">
              <Smartphone className="w-3.5 h-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-4">
              {t("hero.heading")}
            </h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              {t("hero.subheading")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => {
              const Icon = ICON_MAP[b.icon];
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-6 rounded-2xl border border-border bg-card text-center hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    {Icon && <Icon className="w-6 h-6 text-primary" />}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Install Instructions */}
      <section className="py-16" style={{ background: "oklch(98% 0.006 80)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-primary">
              {t("install.eyebrow")}
            </div>
            <h2 className="font-serif text-4xl font-bold text-foreground">
              {t("install.heading")}
            </h2>
            <p className="text-muted-foreground mt-3">
              {t("install.subheading")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <InstallColumn
              emoji={t("install.browsers.iosSafari.emoji")}
              label={t("install.browsers.iosSafari.label")}
              meta={t("install.browsers.iosSafari.meta")}
              steps={stepsIosSafari}
              delay={0}
            />
            <InstallColumn
              emoji={t("install.browsers.iosFirefox.emoji")}
              label={t("install.browsers.iosFirefox.label")}
              meta={t("install.browsers.iosFirefox.meta")}
              steps={stepsIosFirefox}
              delay={0.1}
            />
            <InstallColumn
              emoji={t("install.browsers.android.emoji")}
              label={t("install.browsers.android.label")}
              meta={t("install.browsers.android.meta")}
              steps={stepsAndroid}
              delay={0.2}
            />
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            💡 <strong>Tip:</strong> {t("install.tip")}
          </p>
        </div>
      </section>

      {/* Share */}
      <section className="py-16 bg-background">
        <div className="container max-w-lg mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-3">
            {t("share.heading")}
          </h2>
          <p className="text-muted-foreground mb-8">{t("share.subheading")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-sm font-semibold text-foreground"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? t("share.copiedConfirm") : t("share.copyIdle")}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-semibold"
            >
              <Share2 className="w-4 h-4" />
              {t("share.whatsappLabel")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
