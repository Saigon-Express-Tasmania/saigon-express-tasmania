"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppImage from "@/components/AppImage";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_BANNER_CLASS,
  MEMBER_PORTAL_CARD_HOVER_CLASS,
} from "@/lib/member-portal-surfaces";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useWholesaleInventory } from "@/contexts/WholesaleInventoryContext";
import { useSupabase, supabase } from "@/hooks/useSupabase";
import {
  applyWholesaleProductAvailability,
  type WholesaleProductAvailabilityRow,
} from "@/types";
import { buildWholesaleProductsAvailabilityRpcArgs } from "@/lib/wholesale-availability-rpc";
import { resolvePortalType } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { SiteCategory, UserProfile, WholesaleProduct } from "@/types";
import { pickWholesaleImageUrl } from "@/types";
import { Plus, Package, Building2, Search } from "lucide-react";
import { toast } from "sonner";

const ALL_CATEGORY = "All";

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
  effectiveRemaining: number;
  globalRemaining: number;
  customerRemaining: number | null;
  dailyCustomerLimit: number | null;
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
    effectiveRemaining: p.effectiveRemaining,
    globalRemaining: p.globalRemaining,
    customerRemaining: p.customerRemaining,
    dailyCustomerLimit: p.dailyCustomerLimit,
  };
}

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export default function WholesaleShop({
  products,
  inventory,
  categoriesContent,
}: {
  products: WholesaleProduct[];
  inventory: WholesaleProductAvailabilityRow[];
  categoriesContent: SiteCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, authMetadata, isLoading, signOut } = useSupabase();
  const { addToCart, getCartQty, clearCart } = useWholesaleCart();
  const { setInventory, validateQty, getMaxQty } = useWholesaleInventory();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [shopProducts, setShopProducts] = useState(products);

  const categoryStyleMap = useMemo(
    () =>
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        if (category.style) acc[category.name] = category.style;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const categoryIconMap = useMemo(
    () =>
      categoriesContent.reduce<Record<string, string>>((acc, category) => {
        if (category.icon) acc[category.name] = category.icon;
        return acc;
      }, {}),
    [categoriesContent],
  );

  const me = useMemo(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }
    return {
      businessName: profile.business_name ?? "Your Business",
      contactName: getContactName(profile),
      portalType: resolvePortalType(authMetadata.privileges),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const applyInventoryToProducts = (
    rows: WholesaleProductAvailabilityRow[],
    baseProducts: WholesaleProduct[],
  ) => {
    const availabilityByProductId = new Map(
      rows.map((row) => [row.product_id, row]),
    );
    return baseProducts.map((product) =>
      applyWholesaleProductAvailability(
        product,
        availabilityByProductId.get(product.id),
      ),
    );
  };

  useLayoutEffect(() => {
    setInventory(inventory);
    setShopProducts(applyInventoryToProducts(inventory, products));
  }, [inventory, products, setInventory]);

  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase.rpc(
        "get_wholesale_products_availability",
        buildWholesaleProductsAvailabilityRpcArgs(profile.id),
      );

      if (cancelled || error || !data) return;

      const rows = data as WholesaleProductAvailabilityRow[];
      setInventory(rows);
      setShopProducts(applyInventoryToProducts(rows, products));
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, products, setInventory]);

  useEffect(() => {
    if (!isLoading && !me) {
      router.push("/member");
    }
  }, [me, isLoading, router]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      clearCart();
      toast.success("Payment successful! Your wholesale order has been placed.");
    } else if (checkout === "cancelled") {
      toast.error("Checkout was cancelled. Your cart is unchanged.");
    } else if (checkout === "failed") {
      toast.error("Payment failed. Please try again.");
    }

    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname, clearCart]);

  const allProducts = useMemo(() => shopProducts.map(mapProduct), [shopProducts]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return allProducts.filter((p) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORY || p.category === selectedCategory;
      const matchesSearch =
        !normalizedSearch ||
        p.name.toLowerCase().includes(normalizedSearch) ||
        p.description.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, search, selectedCategory]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const handleAddToCart = (product: DashboardProduct) => {
    const cartQty = getCartQty(product.id);
    const nextQty = cartQty + 1;
    const validation = validateQty(product.id, nextQty, product.name);

    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    addToCart({
      productId: product.id,
      productName: product.name,
      unitPrice: product.priceExGst,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <MemberPortalBackground>
      <MemberHeader member={me} onLogout={() => void handleLogout()} />

      {/* Welcome banner */}
      <div className={`py-6 ${MEMBER_PORTAL_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            {me ? (
              <div>
                <h1 className="font-serif text-2xl font-bold text-white">
                  Welcome, {me.contactName}
                </h1>
                <p className="text-white/45 text-sm">
                  {me.businessName}
                </p>
              </div>
            ) : null}
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
          <button
            type="button"
            onClick={() => setSelectedCategory(ALL_CATEGORY)}
            className={`text-xs font-semibold tracking-wide px-4 py-2 rounded-full border transition-colors ${
              selectedCategory === ALL_CATEGORY
                ? "bg-white text-black border-white"
                : "border-white/20 text-white/50 hover:border-white/50 hover:text-white"
            }`}
          >
            {ALL_CATEGORY}
          </button>
          {categoriesContent.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.name)}
              className={`text-xs font-semibold tracking-wide px-4 py-2 rounded-full border transition-colors ${
                selectedCategory === category.name
                  ? "bg-white text-black border-white"
                  : "border-white/20 text-white/50 hover:border-white/50 hover:text-white"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => {
            const gradientClass =
              categoryStyleMap[product.category] ?? "from-gray-800 to-gray-600";
            const icon = categoryIconMap[product.category];
            const cartQty = getCartQty(product.id);
            const maxQty = getMaxQty(product.id);
            const outOfStock =
              !product.isAvailable || product.effectiveRemaining <= 0;
            const atCartMax =
              Number.isFinite(maxQty) && cartQty >= maxQty;
            const customerLimitIsTighter =
              product.dailyCustomerLimit != null &&
              product.customerRemaining != null &&
              product.customerRemaining < product.globalRemaining;

            return (
              <div
                key={product.id}
                className={`group ${MEMBER_PORTAL_CARD_HOVER_CLASS} ${outOfStock ? "opacity-60" : ""}`}
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
                      {icon ? (
                        <span className="text-5xl opacity-80">{icon}</span>
                      ) : (
                        <Package className="w-12 h-12 opacity-80 text-white" />
                      )}
                    </div>
                  )}
                  {product.badge ? (
                    <div className="absolute top-3 left-3 text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md bg-primary text-white">
                      {product.badge}
                    </div>
                  ) : null}
                  {outOfStock ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        Out of Stock
                      </span>
                    </div>
                  ) : null}
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

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold text-white">
                        ${Number(product.priceExGst).toFixed(2)}
                      </div>
                      <div className="text-xs text-white/35">
                        per {product.unit} ex GST
                      </div>
                      {product.effectiveRemaining > 0 ? (
                        <div className="text-[11px] text-white/40 mt-1 leading-snug">
                          {product.effectiveRemaining} left today
                          {customerLimitIsTighter ? (
                            <span className="text-amber-200/90">
                              {" - your limit: "}
                              {product.customerRemaining}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {cartQty > 0 ? (
                      <div className="text-xs font-semibold text-primary bg-primary/15 px-2 py-1 rounded-lg">
                        {cartQty} in cart
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={outOfStock || atCartMax}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {outOfStock
                      ? "Out of Stock"
                      : atCartMax
                        ? "Limit reached"
                        : "Add to Cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No products found</p>
          </div>
        ) : null}
      </div>
    </MemberPortalBackground>
  );
}
