"use client";

import Link from "@/components/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Plus, Minus, MapPin, CreditCard } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const DELIVERY_STORES_PATH = "/stores";

/** Render a compact summary of customisation selections beneath an item name */
function CustomisationSummary({ customisation }: { customisation: NonNullable<ReturnType<typeof useCart>["cart"][number]["customisation"]> }) {
  const { selections, note, extraPrice } = customisation;

  // Flatten all selected option labels
  const labels: string[] = [];
  Object.values(selections).forEach(ids => {
    ids.forEach(id => {
      const readable = id
        .replace(/^(no_|extra_|sauce_|well_|rare_)/, match => {
          if (match === "no_") return "No ";
          if (match === "extra_") return "Extra ";
          if (match === "sauce_") return "";
          if (match === "well_") return "Well ";
          if (match === "rare_") return "Rare ";
          return match;
        })
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
      labels.push(readable);
    });
  });

  if (labels.length === 0 && !note) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {labels.length > 0 && (
        <p className="text-[11px] text-brand-dark/50 leading-relaxed">
          {labels.join(" · ")}
          {extraPrice > 0 && (
            <span className="text-brand-red font-medium ml-1">+${extraPrice.toFixed(2)}</span>
          )}
        </p>
      )}
      {note && (
        <p className="text-[11px] text-brand-dark/40 italic">"{note}"</p>
      )}
    </div>
  );
}

export default function CartDrawer() {
  const router = useRouter();
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty } = useCart();

  const cartTotal = cart.reduce((s, c) => {
    const extra = c.customisation?.extraPrice ?? 0;
    return s + (parseFloat(c.item.price) + extra) * c.qty;
  }, 0);

  const handleGoToCheckout = () => {
    setCartOpen(false);
    router.push("/checkout");
  };

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex">
      <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
      <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-serif text-xl text-brand-dark">Your Order</h2>
          <button onClick={() => setCartOpen(false)} className="p-1 text-brand-dark/40 hover:text-brand-dark">
            <X size={20} />
          </button>
        </div>

        {/* Pickup-only banner */}
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-start gap-2.5">
          <MapPin size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">In-Store Pickup Only</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Want delivery?{" "}
              <Link
                href={DELIVERY_STORES_PATH}
                onClick={() => setCartOpen(false)}
                className="font-semibold underline hover:text-amber-900 inline-flex items-center gap-0.5"
              >
                Select your store →
              </Link>
            </p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingCart size={40} className="text-brand-dark/20 mb-4" />
            <p className="font-serif text-xl text-brand-dark/40">Your cart is empty</p>
            <Link
              href="/menu"
              onClick={() => setCartOpen(false)}
              className="mt-4 text-sm text-brand-red font-semibold hover:underline"
            >
              Browse the Menu →
            </Link>
            <Link
              href={DELIVERY_STORES_PATH}
              onClick={() => setCartOpen(false)}
              className="mt-3 text-xs text-brand-dark/40 hover:text-brand-red flex items-center gap-1 transition-colors"
            >
              <MapPin size={11} />
              Order delivery — select your nearest store
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((cartLine) => {
                const { cartLineId, item, qty, customisation } = cartLine;
                const linePrice = (parseFloat(item.price) + (customisation?.extraPrice ?? 0)) * qty;
                return (
                  <div key={cartLineId} className="bg-brand-cream p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-dark text-sm truncate">{item.name}</p>
                        <p className="text-xs text-brand-dark/40">
                          ${(parseFloat(item.price) + (customisation?.extraPrice ?? 0)).toFixed(2)} each
                        </p>
                        {customisation && (
                          <CustomisationSummary customisation={customisation} />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateQty(cartLineId, -1)}
                          className="w-7 h-7 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{qty}</span>
                        <button
                          onClick={() => updateQty(cartLineId, 1)}
                          className="w-7 h-7 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(cartLineId)}
                        className="text-brand-dark/30 hover:text-brand-red transition-colors ml-1 flex-shrink-0 mt-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <span className="text-xs font-semibold text-brand-dark">${linePrice.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-gray-100 space-y-3">
              <div className="flex justify-between font-bold text-brand-dark text-lg">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleGoToCheckout}
                className="w-full bg-brand-red text-white py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard size={15} />
                Proceed to Checkout
              </button>
              <Link
                href={DELIVERY_STORES_PATH}
                onClick={() => setCartOpen(false)}
                className="w-full border border-brand-red text-brand-red py-2.5 font-semibold text-sm hover:bg-brand-red/5 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin size={14} />
                Order Delivery Instead
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
