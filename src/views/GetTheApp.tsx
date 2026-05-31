"use client";

import AppImage from "@/components/AppImage";
import { motion } from "framer-motion";
import Link from "@/components/link";
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
import { LOGO_URL } from "@/lib/site-images";

const BENEFITS = [
  {
    icon: Zap,
    title: "Order in One Tap",
    desc: "Menu always ready — order faster than searching a browser.",
  },
  {
    icon: Star,
    title: "Exclusive Deals",
    desc: "App-only promotions and loyalty rewards before they run out.",
  },
  {
    icon: MapPin,
    title: "Find Stores Instantly",
    desc: "View all 8 Tasmania locations with hours and directions.",
  },
  {
    icon: Smartphone,
    title: "No App Store Needed",
    desc: "Installs directly from your browser. Zero storage used.",
  },
];

const STEPS_IOS_SAFARI = [
  {
    num: "1",
    text: "Open saigonexpress.com.au in Safari (not Chrome or Firefox).",
  },
  {
    num: "2",
    text: "Tap the Share button ⬆ at the bottom centre of Safari — it looks like a box with an arrow pointing up.",
  },
  {
    num: "3",
    text: 'Scroll down in the share sheet and tap "Add to Home Screen" (with a ⊕ icon).',
  },
  {
    num: "!",
    text: "In the name field, make sure it says Saigon Express. If it shows something else, clear it and type Saigon Express.",
  },
  {
    num: "✓",
    text: "Tap Add in the top-right corner — the Saigon Express icon appears on your home screen!",
  },
];

const STEPS_IOS_FIREFOX = [
  { num: "1", text: "Open saigonexpress.com.au in Firefox." },
  {
    num: "2",
    text: "Tap the ⋯ menu button at the bottom-right of the screen.",
  },
  { num: "3", text: "Tap Share from the menu that appears." },
  {
    num: "4",
    text: 'In the iOS share sheet, tap "View More" then tap "Add to Home Screen".',
  },
  {
    num: "!",
    text: "In the name field, check it says Saigon Express. If not, clear it and type Saigon Express.",
  },
  {
    num: "✓",
    text: "Tap Add — the Saigon Express icon appears on your home screen!",
  },
];

const STEPS_ANDROID = [
  { num: "1", text: "Open saigonexpress.com.au in Chrome." },
  { num: "2", text: "Tap the ⋮ menu in the top-right corner of Chrome." },
  { num: "3", text: 'Select "Add to Home Screen".' },
  {
    num: "✓",
    text: "Tap Add — the Saigon Express icon appears on your home screen!",
  },
];

function StepCard({ step }: { step: { num: string; text: string } }) {
  const isCheck = step.num === "✓";
  const isWarn = step.num === "!";
  return (
    <div
      className={`flex gap-4 p-4 rounded-xl border ${isCheck ? "border-green-200 bg-green-50" : isWarn ? "border-amber-200 bg-amber-50" : "border-border bg-card"}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isCheck ? "bg-green-500 text-white" : isWarn ? "bg-amber-400 text-white" : "bg-primary text-white"}`}
      >
        {step.num}
      </div>
      <p className="text-sm text-foreground leading-relaxed pt-1">
        {step.text}
      </p>
    </div>
  );
}

export default function GetTheApp() {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard
      .writeText("https://www.saigonexpress.com.au/get-the-app")
      .then(() => {
        setCopied(true);
        toast.success("Link copied!");
        setTimeout(() => setCopied(false), 2000);
      });
  };

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
              alt="Saigon Express Tasmania"
              width={220}
              height={64}
              priority
              className="h-16 w-auto object-contain mx-auto mb-6"
            />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-white/60 mb-6">
              <Smartphone className="w-3.5 h-3.5" /> Free · No App Store Needed
            </div>
            <h1 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-4">
              Get the Saigon Express App
            </h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              Faster ordering. Exclusive deals. Always ready. Add Saigon Express
              to your home screen — no App Store, no storage used. Just one tap
              to open anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-2xl border border-border bg-card text-center hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {b.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Install Instructions */}
      <section className="py-16" style={{ background: "oklch(98% 0.006 80)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-primary">
              HOW TO INSTALL
            </div>
            <h2 className="font-serif text-4xl font-bold text-foreground">
              Add to Your Home Screen
            </h2>
            <p className="text-muted-foreground mt-3">
              Choose your device and browser below.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* iOS Safari */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div
                className="p-5 border-b border-border"
                style={{ background: "oklch(13% 0.008 30)" }}
              >
                <div className="text-2xl mb-1">🍎</div>
                <div className="font-bold text-white">iPhone — Safari</div>
                <div className="text-xs text-white/50 mt-1">
                  Recommended · 3 steps
                </div>
              </div>
              <div className="p-5 space-y-3">
                {STEPS_IOS_SAFARI.map((s, i) => (
                  <StepCard key={i} step={s} />
                ))}
              </div>
            </motion.div>

            {/* iOS Firefox */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div
                className="p-5 border-b border-border"
                style={{ background: "oklch(13% 0.008 30)" }}
              >
                <div className="text-2xl mb-1">🦊</div>
                <div className="font-bold text-white">iPhone — Firefox</div>
                <div className="text-xs text-white/50 mt-1">5 steps</div>
              </div>
              <div className="p-5 space-y-3">
                {STEPS_IOS_FIREFOX.map((s, i) => (
                  <StepCard key={i} step={s} />
                ))}
              </div>
            </motion.div>

            {/* Android Chrome */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div
                className="p-5 border-b border-border"
                style={{ background: "oklch(13% 0.008 30)" }}
              >
                <div className="text-2xl mb-1">🤖</div>
                <div className="font-bold text-white">Android — Chrome</div>
                <div className="text-xs text-white/50 mt-1">3 steps</div>
              </div>
              <div className="p-5 space-y-3">
                {STEPS_ANDROID.map((s, i) => (
                  <StepCard key={i} step={s} />
                ))}
              </div>
            </motion.div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            💡 <strong>Tip:</strong> Safari works best on iPhone — it installs
            in 3 steps instead of 5.
          </p>
        </div>
      </section>

      {/* Share section */}
      <section className="py-16 bg-background">
        <div className="container max-w-lg mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-3">
            Open This Page on Your Phone
          </h2>
          <p className="text-muted-foreground mb-8">
            Works on iPhone (Safari) and Android (Chrome) · No App Store needed
          </p>
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
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Add Saigon Express Tasmania to your home screen: https://www.saigonexpress.com.au/get-the-app")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-semibold"
            >
              <Share2 className="w-4 h-4" /> Share via WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
