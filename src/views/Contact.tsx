"use client";

import { useState } from "react";
import Link from "@/components/link";
import { useTranslations } from "next-intl";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { StoreLocation } from "@/types";

type ContactProps = {
  storeLocations: StoreLocation[];
};

interface HoursItem {
  day: string;
  hours: string;
}

export default function Contact({ storeLocations }: ContactProps) {
  const t = useTranslations("Contact");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Directly pull structured localized arrays from JSON definitions
  const hoursSchedule: HoursItem[] = t.raw("hours.schedule");

  const submitContact = trpc.public.submitContactMessage.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success(t("toasts.success"));
    },
    onError: () => toast.error(t("toasts.error")),
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(t("toasts.validation"));
      return;
    }
    submitContact.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject.trim() || undefined,
      message: form.message.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero */}
      <section className="bg-brand-dark py-16 px-6">
        <div className="max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">
            {t("hero.badge")}
          </p>
          <h1 className="font-serif text-white text-4xl md:text-5xl leading-tight mb-4">
            {t("hero.title")}
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            {t("hero.description")}
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-6 py-14 grid md:grid-cols-2 gap-14">
        {/* Left: contact info */}
        <div className="space-y-10">
          {/* Quick contact */}
          <div>
            <h2 className="font-serif text-brand-dark text-2xl mb-5">
              {t("info.title")}
            </h2>
            <div className="space-y-4">
              <a
                href="tel:0416036016"
                className="flex items-center gap-4 group"
              >
                <div className="w-11 h-11 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-red/20 transition-colors">
                  <Phone size={18} className="text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-brand-dark/40 uppercase tracking-wider font-semibold mb-0.5">
                    {t("info.phoneLabel")}
                  </p>
                  <p className="text-brand-dark font-semibold group-hover:text-brand-red transition-colors">
                    0416 036 016
                  </p>
                </div>
              </a>
              <a
                href="mailto:info@saigonexpress.com.au"
                className="flex items-center gap-4 group"
              >
                <div className="w-11 h-11 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-red/20 transition-colors">
                  <Mail size={18} className="text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-brand-dark/40 uppercase tracking-wider font-semibold mb-0.5">
                    {t("info.emailLabel")}
                  </p>
                  <p className="text-brand-dark font-semibold group-hover:text-brand-red transition-colors">
                    info@saigonexpress.com.au
                  </p>
                </div>
              </a>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-brand-dark/40 uppercase tracking-wider font-semibold mb-0.5">
                    {t("info.locationsLabel")}
                  </p>
                  <p className="text-brand-dark font-semibold">
                    {t("info.storesCount", { count: storeLocations.length })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Opening hours */}
          <div>
            <h2 className="font-serif text-brand-dark text-2xl mb-5 flex items-center gap-2">
              <Clock size={20} className="text-brand-red" /> {t("hours.title")}
            </h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {hoursSchedule.map((h, i) => (
                <div
                  key={h.day}
                  className={`flex justify-between items-center px-5 py-3.5 text-sm ${i < hoursSchedule.length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <span className="text-brand-dark/70 font-medium">
                    {h.day}
                  </span>
                  <span className="text-brand-dark font-semibold">
                    {h.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <h2 className="font-serif text-brand-dark text-2xl mb-5">
              {t("locations.title")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {storeLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="bg-white rounded-xl border border-gray-100 p-4"
                >
                  <p className="font-bold text-brand-dark text-sm mb-1">
                    {loc.name}
                  </p>
                  <p className="text-brand-dark/50 text-xs leading-relaxed">
                    {loc.address}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/stores"
              className="inline-flex items-center gap-1.5 text-brand-red text-sm font-semibold mt-4 hover:underline"
            >
              {t("locations.viewAll")}
            </Link>
          </div>
        </div>

        {/* Right: contact form */}
        <div>
          <h2 className="font-serif text-brand-dark text-2xl mb-6">
            {t("form.title")}
          </h2>
          {submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="font-serif text-brand-dark text-xl mb-2">
                {t("form.successTitle")}
              </h3>
              <p className="text-brand-dark/60 text-sm mb-6">
                {t("form.successText")}
              </p>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setForm({
                    name: "",
                    email: "",
                    phone: "",
                    subject: "",
                    message: "",
                  });
                }}
                variant="outline"
                className="border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
              >
                {t("form.btnAnother")}
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                    {t("form.labelName")}
                  </label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder={t("form.placeholderName")}
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                    {t("form.labelEmail")}
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder={t("form.placeholderEmail")}
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20 bg-white"
                    required
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                    {t("form.labelPhone")}
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder={t("form.placeholderPhone")}
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                    {t("form.labelSubject")}
                  </label>
                  <Input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder={t("form.placeholderSubject")}
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                  {t("form.labelMessage")}
                </label>
                <Textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder={t("form.placeholderMessage")}
                  rows={5}
                  className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20 resize-none bg-white"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitContact.isPending}
                className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-semibold py-3 gap-2"
              >
                {submitContact.isPending ? (
                  t("form.btnSending")
                ) : (
                  <>
                    <Send size={16} /> {t("form.btnSubmit")}
                  </>
                )}
              </Button>
              <p className="text-brand-dark/40 text-xs text-center">
                {t("form.note")}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
