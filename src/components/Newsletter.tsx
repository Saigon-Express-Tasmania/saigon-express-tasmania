"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";

export default function Newsletter() {
  const t = useTranslations("Newsletter");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);

  const subscribeMutation = trpc.public.subscribeNewsletter.useMutation({
    onSuccess: () => {
      setSubSuccess(true);
      setEmail("");
      setName("");
    },
  });

  return (
    <div>
      {/* Get in Touch */}
      <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
        {t("getInTouch")}
      </h4>
      <ul className="space-y-2 text-sm mb-6">
        <li>
          <a
            href="mailto:info@saigonexpress.com.au"
            className="hover:text-white transition-colors"
          >
            info@saigonexpress.com.au
          </a>
        </li>
        <li>
          <a
            href="tel:0416036016"
            className="hover:text-white transition-colors"
          >
            {t("phoneLabel")}
          </a>
        </li>
        <li className="text-white/60 text-xs leading-relaxed whitespace-pre-line">
          {t("address")}
        </li>
      </ul>

      {/* Stay Updated */}
      <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">
        {t("stayUpdated")}
      </h4>

      {subSuccess ? (
        <p className="text-green-400 text-sm">{t("successMessage")}</p>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-sm px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-red"
          />
          <input
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-sm px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-red"
          />
          <button
            onClick={() => {
              if (name && email) subscribeMutation.mutate({ name, email });
            }}
            disabled={subscribeMutation.isPending || !name || !email}
            className="w-full btn-red justify-center py-2 text-sm disabled:opacity-50"
          >
            {subscribeMutation.isPending ? t("subscribing") : t("subscribe")}
          </button>
        </div>
      )}
    </div>
  );
}
