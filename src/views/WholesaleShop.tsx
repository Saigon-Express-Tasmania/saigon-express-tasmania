"use client";

import AppImage from "@/components/AppImage";
import { motion } from "framer-motion";
import { ChevronRight, Search, Lock, Package, CheckCircle } from "lucide-react";
import Link from "@/components/link";
import { useState } from "react";
import type { WholesaleProduct } from "@/types";
import { pickWholesaleImageUrl } from "@/types";

const PRICING_TIERS = [
  {
    label: "Standard",
    min: "1–9 units",
    discount: "0%",
    color: "from-white/5 to-white/10",
  },
  {
    label: "Bronze",
    min: "10–24 units",
    discount: "5% off",
    color: "from-amber-900/30 to-amber-800/20",
  },
  {
    label: "Silver",
    min: "25–49 units",
    discount: "10% off",
    color: "from-slate-600/30 to-slate-500/20",
  },
  {
    label: "Gold",
    min: "50–99 units",
    discount: "15% off",
    color: "from-yellow-700/30 to-yellow-600/20",
    popular: true,
  },
  {
    label: "Platinum",
    min: "100+ units",
    discount: "25% off",
    color: "from-primary/30 to-primary/20",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Dough: "from-amber-800 to-amber-600",
  "Dried Foods": "from-yellow-800 to-yellow-600",
  Equipment: "from-slate-700 to-slate-500",
  "Fresh Food": "from-green-800 to-green-600",
  "Frozen Food": "from-blue-800 to-blue-600",
  "Frozen Marinated Meat": "from-red-900 to-red-700",
  Packaging: "from-stone-700 to-stone-500",
  Sauce: "from-orange-800 to-orange-600",
  Pastry: "from-amber-700 to-amber-500",
};
const CATEGORY_ICONS: Record<string, string> = {
  Dough: "🥖",
  "Dried Foods": "🌾",
  Equipment: "🔧",
  "Fresh Food": "🥗",
  "Frozen Food": "❄️",
  "Frozen Marinated Meat": "🥩",
  Packaging: "📦",
  Sauce: "🫙",
  Pastry: "🥐",
};

export default function WholesaleShop({
  products,
}: {
  products: WholesaleProduct[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const allCategories = [
    "All",
    "Dough",
    "Dried Foods",
    "Equipment",
    "Fresh Food",
    "Frozen Food",
    "Frozen Marinated Meat",
    "Packaging",
    "Sauce",
  ];

  const normalizedSearch = search.trim().toLowerCase();
  const displayProducts = (
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory)
  ).filter(
    (p) =>
      p.name.toLowerCase().includes(normalizedSearch) ||
      (p.description ?? "").toLowerCase().includes(normalizedSearch),
  );

  const filtered = displayProducts;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <section className="py-16 border-b border-border/40 bg-background">
        <div className="container">
          <h1 className="font-serif text-5xl lg:text-6xl font-bold text-foreground mb-3">
            Our Products
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore our complete range of authentic Vietnamese food products for
            wholesale supply across Tasmania.
          </p>
        </div>
      </section>

      {/* Wholesale members banner */}
      <section className="py-0">
        <div className="container py-5">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-black" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-7">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-lg mb-1">
                    Wholesale Pricing — Members Only
                  </div>
                  <p className="text-white/65 text-sm max-w-md">
                    Prices for all food products are available exclusively to
                    approved wholesale clients. Register your business to unlock
                    pricing and place orders.
                  </p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/55">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />{" "}
                      Custom negotiated prices
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />{" "}
                      Minimum order quantities
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />{" "}
                      Priority support
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/wholesale-member-portal">
                <button className="shrink-0 flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">
                  Register for Wholesale <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PIN entry notice */}
      <section className="py-3">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 rounded-xl border border-primary/25 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">
                  This page is for registered wholesale customers
                </div>
                <div className="text-xs text-muted-foreground">
                  Register to view wholesale pricing and place orders. If you
                  already have a PIN, enter it to view prices now.
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/wholesale-member-portal">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                  Register for Pricing
                </button>
              </Link>
              <Link href="/portals/wholesale">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:border-primary/40 transition-colors">
                  Enter PIN
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search + product grid */}
      <section className="py-8">
        <div className="container">
          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-semibold tracking-wide px-4 py-2 rounded-full border transition-colors ${
                  selectedCategory === cat
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary bg-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground self-center">
              {filtered.length} items
            </span>
          </div>

          {/* Product grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p, i) => {
              const img = pickWholesaleImageUrl(
                p.imageUrls,
                [512, 1024, 256, 1448],
              );
              const gradientClass =
                CATEGORY_COLORS[p.category] ?? "from-gray-800 to-gray-600";
              const catIcon = CATEGORY_ICONS[p.category] ?? "📦";
              const desc = p.description ?? "";
              const badge: string | null = null;
              const specs: [string, string][] = [
                ["Unit", p.unit],
                [
                  "Price (ex GST)",
                  p.unitPrice
                    ? `$${Number(p.unitPrice).toFixed(2)}`
                    : "Members only",
                ],
                ...(p.minOrderQty
                  ? ([["Min Order", `${p.minOrderQty} units`]] as [
                      string,
                      string,
                    ][])
                  : []),
              ];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 4) * 0.07 }}
                  className="group rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="relative h-44 overflow-hidden bg-muted">
                    {img ? (
                      <AppImage
                        src={img}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}
                      >
                        <span className="text-5xl opacity-80">{catIcon}</span>
                      </div>
                    )}
                    {badge && (
                      <div className="absolute top-3 left-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary text-white">
                        {badge}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-black/60 text-white backdrop-blur-sm">
                      {p.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground text-sm mb-2 leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                      {desc}
                    </p>

                    {/* Specs table */}
                    <div className="rounded-lg border border-border/60 overflow-hidden mb-4">
                      {specs.map(([key, val]) => (
                        <div
                          key={key}
                          className="flex justify-between px-3 py-1.5 text-xs border-b border-border/40 last:border-0"
                        >
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-medium text-foreground">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Price locked */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Wholesale pricing only</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href="/wholesale-member-portal" className="flex-1">
                        <button className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                          🔑 Enter PIN
                        </button>
                      </Link>
                      <Link
                        href="/wholesale-member-portal?mode=register"
                        className="flex-1"
                      >
                        <button className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
                          New? Register
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No products found for "{search}"</p>
              <p className="text-sm mt-1">Try a different search term.</p>
            </div>
          )}
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="py-20" style={{ background: "oklch(13% 0.008 30)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <div
              className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: "oklch(71% 0.155 62)" }}
            >
              BULK PRICING
            </div>
            <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-4">
              Volume Discount Tiers
            </h2>
            <p className="text-white/45 max-w-md mx-auto">
              Discounts apply per line item based on quantity ordered. Mix and
              match products to maximise your savings.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
            {PRICING_TIERS.map((tier, i) => (
              <motion.div
                key={tier.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative bg-gradient-to-br ${tier.color} rounded-2xl p-6 border border-white/10 text-center min-w-[150px] ${tier.popular ? "ring-2 ring-primary/60" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-primary text-white whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-xs font-bold tracking-[0.15em] uppercase text-white/50 mb-2">
                  {tier.label}
                </div>
                <div className="font-serif text-3xl font-bold text-white mb-1">
                  {tier.discount}
                </div>
                <div className="mt-2 text-white/55 text-sm font-medium">
                  {tier.min}
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-white/25 text-xs mt-8">
            Prices exclusive of GST. Minimum order value applies. Contact us for
            custom pricing on large accounts.
          </p>
          <div className="text-center mt-8">
            <Link href="/wholesale-member-portal">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                Register for Wholesale Access{" "}
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
