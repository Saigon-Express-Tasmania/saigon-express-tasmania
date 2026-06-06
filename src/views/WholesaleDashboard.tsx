"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { useSupabase } from "@/hooks/useSupabase";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { UserProfile, WholesaleProduct } from "@/types";
import { pickWholesaleImageUrl } from "@/types";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  LogOut,
  Package,
  ChevronRight,
  Building2,
  Search,
} from "lucide-react";

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

const ALL_CATEGORIES = [
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

type DashboardProduct = {
  id: number;
  name: string;
  category: string;
  description: string;
  priceExGst: number;
  unit: string;
  badge: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  minOrderQty: number;
  stockQty: number;
};

type CartItem = {
  id: number;
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
};

function mapProduct(p: WholesaleProduct): DashboardProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description ?? "",
    priceExGst: Number(p.unitPrice ?? 0),
    unit: p.unit,
    badge: null,
    imageUrl: pickWholesaleImageUrl(p.imageUrls, [512, 1024, 256, 1448]),
    isAvailable: p.isAvailable,
    minOrderQty: p.minOrderQty ?? 1,
    stockQty: p.stockQty ?? 0,
  };
}

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export default function WholesaleDashboard({
  products,
}: {
  products: WholesaleProduct[];
}) {
  const router = useRouter();
  const { profile, authMetadata, isLoading, signOut } = useSupabase();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const me = useMemo(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }
    return {
      businessName: profile.business_name ?? "Your Business",
      contactName: getContactName(profile),
      portalType: profile.business_type as "wholesale" | "warehouse",
    };
  }, [profile, authMetadata]);

  useEffect(() => {
    if (!isLoading && !me) {
      router.push("/wholesale/member");
    }
  }, [me, isLoading, router]);

  const allProducts = useMemo(() => products.map(mapProduct), [products]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return allProducts.filter((p) => {
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchesSearch =
        !normalizedSearch ||
        p.name.toLowerCase().includes(normalizedSearch) ||
        p.description.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, search, selectedCategory]);

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartTotal = cart.reduce(
    (sum, c) => sum + Number(c.unitPrice) * c.qty,
    0,
  );

  const addToCart = (product: DashboardProduct) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          productId: product.id,
          productName: product.name,
          qty: 1,
          unitPrice: product.priceExGst,
        },
      ];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQty = (
    productId: number,
    productName: string,
    unitPrice: number,
    delta: number,
  ) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      const newQty = Math.max(0, (existing?.qty ?? 0) + delta);
      if (newQty === 0) {
        return prev.filter((c) => c.productId !== productId);
      }
      if (existing) {
        return prev.map((c) =>
          c.productId === productId ? { ...c, qty: newQty } : c,
        );
      }
      return [
        ...prev,
        {
          id: productId,
          productId,
          productName,
          qty: newQty,
          unitPrice,
        },
      ];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/wholesale/member");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express"
              width={LOGO_INTRINSIC.width}
              height={LOGO_INTRINSIC.height}
              className={`h-9 ${LOGO_IMG_CLASS}`}
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-white">
                {me.businessName}
              </div>
              <div className="text-xs text-white/40 capitalize">
                {me.portalType} member
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-semibold">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-white/40 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="border-b border-white/10 py-6">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">
                Welcome, {me.contactName}
              </h1>
              <p className="text-white/45 text-sm">
                {me.businessName} ·{" "}
                {me.portalType === "wholesale" ? "Wholesale" : "Warehouse"}{" "}
                Member
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products section */}
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-semibold tracking-wide px-4 py-2 rounded-full border transition-colors ${
                selectedCategory === cat
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white/50 hover:border-white/50 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => {
            const gradientClass =
              CATEGORY_COLORS[product.category] ?? "from-gray-800 to-gray-600";
            const icon = CATEGORY_ICONS[product.category] ?? "📦";
            const inCart = cart.find((c) => c.productId === product.id);
            const outOfStock =
              !product.isAvailable || product.stockQty === 0;
            return (
              <div
                key={product.id}
                className={`group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-all ${outOfStock ? "opacity-60" : ""}`}
              >
                <div className="relative h-44 overflow-hidden">
                  {product.imageUrl ? (
                    <AppImage
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}
                    >
                      <span className="text-5xl opacity-80">{icon}</span>
                    </div>
                  )}
                  {product.badge && (
                    <div className="absolute top-3 left-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary text-white">
                      {product.badge}
                    </div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-black/60 text-white backdrop-blur-sm">
                    {product.category}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1.5 leading-snug">
                    {product.name}
                  </h3>
                  <p className="text-xs text-white/40 mb-3 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>

                  {/* Price — visible to members */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-white">
                        ${Number(product.priceExGst).toFixed(2)}
                      </div>
                      <div className="text-xs text-white/35">
                        per {product.unit} ex GST
                      </div>
                    </div>
                    {inCart && (
                      <div className="text-xs font-semibold text-primary bg-primary/15 px-2 py-1 rounded-lg">
                        {inCart.qty} in cart
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {outOfStock ? "Out of Stock" : "Add to Cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No products found</p>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close cart"
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="w-full sm:max-w-md bg-black border-l border-white/10 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" /> Your Cart
              </h2>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Your cart is empty</p>
                  <p className="text-xs mt-1">Add products to get started</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug">
                        {item.productName}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        ${Number(item.unitPrice).toFixed(2)} ex GST
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(
                              item.productId,
                              item.productName,
                              Number(item.unitPrice),
                              -1,
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold text-white w-6 text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(
                              item.productId,
                              item.productName,
                              Number(item.unitPrice),
                              1,
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-white">
                        ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateQty(
                            item.productId,
                            item.productName,
                            Number(item.unitPrice),
                            -item.qty,
                          )
                        }
                        className="mt-2 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-white/10 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal (ex GST)</span>
                  <span className="font-bold text-white">
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">GST (10%)</span>
                  <span className="font-bold text-white">
                    ${(cartTotal * 0.1).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-white/10 pt-3">
                  <span className="text-white">Total (inc GST)</span>
                  <span className="text-primary">
                    ${(cartTotal * 1.1).toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  Checkout with Card / Apple Pay
                  <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-white/30 text-center">
                  Secure payment via Stripe · Card & Apple Pay accepted
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
