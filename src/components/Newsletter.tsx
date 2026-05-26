"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Newsletter() {
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
      <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Get in Touch</h4>
      <ul className="space-y-2 text-sm mb-6">
        <li>
          <a href="mailto:info@saigonexpress.com.au" className="hover:text-white transition-colors">
            info@saigonexpress.com.au
          </a>
        </li>
        <li>
          <a href="tel:0416036016" className="hover:text-white transition-colors">
            0416 036 016 (SMS only)
          </a>
        </li>
        <li className="text-white/60 text-xs leading-relaxed">
          Level 2, 86 Collins St
          <br />
          Hobart TAS 7000
        </li>
      </ul>

      <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Stay Updated</h4>
      {subSuccess ? (
        <p className="text-green-400 text-sm">✓ You&apos;re on the list!</p>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Your name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-sm px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-red"
          />
          <input
            type="email"
            placeholder="Email address *"
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
            {subscribeMutation.isPending ? "Subscribing…" : "Subscribe"}
          </button>
        </div>
      )}
    </div>
  );
}
