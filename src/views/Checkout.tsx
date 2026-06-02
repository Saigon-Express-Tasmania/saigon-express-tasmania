"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "@/components/link";
import AppImage from "@/components/AppImage";
import LazyImage from "@/components/LazyImage";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  MapPin,
  Clock,
  User,
  Mail,
  Phone,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  CreditCard,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import type { StoreLocation } from "@/types";

const LOGO_URL = "/manus-storage/saigonexpresslogo_clean_719f26ac.png";

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 11; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 20 && m > 0) break;
      const hour12 = h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? "PM" : "AM";
      const minStr = m === 0 ? "00" : String(m);
      slots.push(`${hour12}:${minStr} ${ampm}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

type CheckoutProps = {
  storeLocations: StoreLocation[];
  initialStoreId?: number | null;
};

interface DateConfig {
  today: string;
  tomorrow: string;
  days: string[];
  months: string[];
}

export default function Checkout({
  storeLocations,
  initialStoreId = null,
}: CheckoutProps) {
  const t = useTranslations("Checkout");
  const stores = storeLocations;
  const { cart, cartTotal, removeFromCart, updateQty, clearCart } = useCart();

  // Load dynamically localized strings for date mapping runtime utilities
  const dateConfig: DateConfig = t.raw("dateStrings");

  const pickupDates = useMemo(() => {
    const dates: { label: string; value: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const label =
        i === 0
          ? `${dateConfig.today}, ${d.getDate()} ${dateConfig.months[d.getMonth()]}`
          : i === 1
            ? `${dateConfig.tomorrow}, ${d.getDate()} ${dateConfig.months[d.getMonth()]}`
            : `${dateConfig.days[d.getDay()]} , ${d.getDate()} ${dateConfig.months[d.getMonth()]}`;
      const value = d.toISOString().split("T")[0];
      dates.push({ label, value });
    }
    return dates;
  }, [dateConfig]);

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(
    initialStoreId,
  );
  useEffect(() => {
    if (initialStoreId && stores.length > 0 && !selectedStoreId) {
      if (stores.find((s) => s.id === initialStoreId))
        setSelectedStoreId(initialStoreId);
    }
  }, [stores, initialStoreId, selectedStoreId]);

  const [pickupDate, setPickupDate] = useState(pickupDates[0]?.value ?? "");
  const [pickupTime, setPickupTime] = useState(TIME_SLOTS[4] ?? "12:00 PM");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState<"cart" | "details" | "confirm">("cart");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  const handleProceedToDetails = () => {
    if (cart.length === 0) {
      toast.error(t("toasts.cartEmpty"));
      return;
    }
    if (!selectedStoreId) {
      toast.error(t("toasts.selectStore"));
      return;
    }
    setStep("details");
  };

  const handleProceedToConfirm = () => {
    if (!name.trim()) {
      toast.error(t("toasts.enterName"));
      return;
    }
    if (!email.trim()) {
      toast.error(t("toasts.enterEmail"));
      return;
    }
    if (!phone.trim()) {
      toast.error(t("toasts.enterPhone"));
      return;
    }
    setStep("confirm");
  };

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    try {
      const result = await invokeEdgeFunction<{
        url?: string | null;
        orderId?: number;
        draftOrderId?: number;
      }>("checkout-pickup", {
        method: "POST",
        body: {
          mode: getClientStripeMode(),
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          storeId: selectedStoreId!,
          pickupTime: `${pickupDate} ${pickupTime}`,
          notes: notes || undefined,
          items: cart.map((c) => ({
            menuItemId: c.item.id,
            qty: c.qty,
            unitPrice:
              parseFloat(c.item.price) + (c.customisation?.extraPrice ?? 0),
            itemName: c.item.name,
          })),
          origin: window.location.origin,
        },
      });

      if (!result.ok) {
        throw new Error(result.error || t("toasts.errorDefault"));
      }

      const data = result.data;

      if (data.url) {
        toast.success(t("toasts.redirecting"));
        setTimeout(() => {
          window.location.href = data.url!;
        }, 300);
        return;
      }

      if (data.orderId) {
        setOrderId(data.orderId);
        setOrderPlaced(true);
        clearCart();
        return;
      }

      throw new Error("No checkout URL returned");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("toasts.errorDefault");
      toast.error(message);
    } finally {
      setIsPlacing(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-serif text-3xl text-brand-dark mb-3">
            {t("success.title")}
          </h1>
          <p className="text-brand-dark/60 mb-2">
            {t("success.message", {
              name,
              orderId: orderId ?? "-1",
            })}
          </p>
          <p className="text-brand-dark/60 mb-6">
            {t("success.pickupSummary", {
              store: selectedStore ? selectedStore.name : "",
              date: pickupDate,
              time: pickupTime,
              email: email,
            })}
          </p>
          <Link href="/menu" className="btn-red inline-flex items-center gap-2">
            <ShoppingCart size={16} /> {t("success.btnMore")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center gap-2 text-sm">
          {[
            { key: "cart", label: t("steps.order") },
            { key: "details", label: t("steps.details") },
            { key: "confirm", label: t("steps.confirm") },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
              <span
                className={`font-medium ${step === s.key ? "text-brand-red" : "text-brand-dark/40"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8">
        {step === "cart" && (
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/menu"
                  className="text-brand-dark/40 hover:text-brand-red transition-colors"
                >
                  <ArrowLeft size={18} />
                </Link>
                <h2 className="font-serif text-2xl text-brand-dark">
                  {t("cartSection.title")}
                </h2>
              </div>

              {cart.length === 0 ? (
                <div className="bg-white p-8 text-center">
                  <ShoppingCart
                    size={32}
                    className="text-brand-dark/20 mx-auto mb-3"
                  />
                  <p className="text-brand-dark/40 mb-4">
                    {t("cartSection.empty")}
                  </p>
                  <Link href="/menu" className="btn-red text-sm">
                    {t("cartSection.browse")}
                  </Link>
                </div>
              ) : (
                <div className="bg-white divide-y divide-gray-50">
                  {cart.map((line) => {
                    const linePrice =
                      (parseFloat(line.item.price) +
                        (line.customisation?.extraPrice ?? 0)) *
                      line.qty;
                    return (
                      <div
                        key={line.cartLineId}
                        className="p-4 flex items-start gap-3"
                      >
                        {line.item.imageUrl && (
                          <LazyImage
                            src={line.item.imageUrl}
                            alt={line.item.name}
                            className="w-14 h-14 object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brand-dark text-sm">
                            {line.item.name}
                          </p>
                          <p className="text-xs text-brand-dark/40">
                            {t("cartSection.each", {
                              price: (
                                parseFloat(line.item.price) +
                                (line.customisation?.extraPrice ?? 0)
                              ).toFixed(2),
                            })}
                          </p>
                          {line.customisation?.note && (
                            <p className="text-xs text-brand-dark/40 italic mt-0.5">
                              &ldquo;{line.customisation.note}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(line.cartLineId, -1)}
                            className="w-7 h-7 border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-sm font-bold">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(line.cartLineId, 1)}
                            className="w-7 h-7 border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-brand-dark flex-shrink-0 w-14 text-right">
                          ${linePrice.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.cartLineId)}
                          className="text-brand-dark/20 hover:text-brand-red ml-1 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-white p-5">
                <h3 className="font-semibold text-brand-dark mb-3 flex items-center gap-2">
                  <MapPin size={16} className="text-brand-red" />{" "}
                  {t("cartSection.pickupStore")}
                </h3>
                {stores.length === 0 ? (
                  <p className="text-sm text-brand-dark/40">
                    {t("cartSection.loadingStores")}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => setSelectedStoreId(store.id)}
                        className={`text-left p-3 border transition-all ${
                          selectedStoreId === store.id
                            ? "border-brand-red bg-red-50/40"
                            : "border-gray-200 hover:border-brand-red/40"
                        }`}
                      >
                        <p className="font-medium text-brand-dark text-sm">
                          {store.name}
                        </p>
                        <p className="text-xs text-brand-dark/50 mt-0.5 leading-snug">
                          {store.address}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-5">
                <h3 className="font-semibold text-brand-dark mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-brand-red" />{" "}
                  {t("cartSection.pickupDateTime")}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-brand-dark/50 font-medium uppercase tracking-wide mb-1 block">
                      {t("cartSection.labelDate")}
                    </label>
                    <select
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-red bg-white"
                    >
                      {pickupDates.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-brand-dark/50 font-medium uppercase tracking-wide mb-1 block">
                      {t("cartSection.labelTime")}
                    </label>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-red bg-white"
                    >
                      {TIME_SLOTS.map((tSlot) => (
                        <option key={tSlot} value={tSlot}>
                          {tSlot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-5 sticky top-24">
                <h3 className="font-semibold text-brand-dark mb-4">
                  {t("summarySection.title")}
                </h3>
                <div className="space-y-2 mb-4">
                  {cart.map((line) => (
                    <div
                      key={line.cartLineId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-brand-dark/70">
                        {line.item.name} × {line.qty}
                      </span>
                      <span className="text-brand-dark font-medium">
                        $
                        {(
                          (parseFloat(line.item.price) +
                            (line.customisation?.extraPrice ?? 0)) *
                          line.qty
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 mb-4">
                  <div className="flex justify-between font-bold text-brand-dark text-lg">
                    <span>{t("summarySection.totalLabel")}</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-brand-dark/40 mt-1">
                    {t("summarySection.gstNote")}
                  </p>
                </div>
                {selectedStore && (
                  <div className="bg-brand-cream p-3 mb-4 text-xs text-brand-dark/60">
                    <p className="font-semibold text-brand-dark mb-1">
                      {t("summarySection.pickupLabel")}
                    </p>
                    <p className="font-medium text-brand-dark mb-0.5">
                      {selectedStore.name}
                    </p>
                    <p>{selectedStore.address}</p>
                    <p className="mt-1">
                      {pickupDate} {t("summarySection.at")} {pickupTime}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleProceedToDetails}
                  disabled={cart.length === 0}
                  className="w-full bg-brand-red text-white py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {t("summarySection.btnContinue")} <ChevronRight size={15} />
                </button>
                <p className="text-xs text-brand-dark/40 text-center mt-3">
                  {t("summarySection.pickupOnlyNote")}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="text-brand-dark/40 hover:text-brand-red transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="font-serif text-2xl text-brand-dark">
                  {t("detailsSection.title")}
                </h2>
              </div>

              <div className="bg-white p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50 mb-1.5 block">
                    <User size={12} className="inline mr-1" />{" "}
                    {t("detailsSection.labelName")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("detailsSection.placeholderName")}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50 mb-1.5 block">
                    <Mail size={12} className="inline mr-1" />{" "}
                    {t("detailsSection.labelEmail")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("detailsSection.placeholderEmail")}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50 mb-1.5 block">
                    <Phone size={12} className="inline mr-1" />{" "}
                    {t("detailsSection.labelPhone")}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("detailsSection.placeholderPhone")}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50 mb-1.5 block">
                    {t("detailsSection.labelNotes")}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("detailsSection.placeholderNotes")}
                    rows={3}
                    className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors resize-none bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-5 sticky top-24">
                <h3 className="font-semibold text-brand-dark mb-4">
                  {t("summarySection.title")}
                </h3>
                <div className="space-y-2 mb-4">
                  {cart.map((line) => (
                    <div
                      key={line.cartLineId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-brand-dark/70">
                        {line.item.name} × {line.qty}
                      </span>
                      <span className="text-brand-dark font-medium">
                        $
                        {(
                          (parseFloat(line.item.price) +
                            (line.customisation?.extraPrice ?? 0)) *
                          line.qty
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 mb-4">
                  <div className="flex justify-between font-bold text-brand-dark text-lg">
                    <span>{t("summarySection.totalLabel")}</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                {selectedStore && (
                  <div className="bg-brand-cream p-3 mb-4 text-xs text-brand-dark/60">
                    <p className="font-semibold text-brand-dark mb-1">
                      {selectedStore.name}
                    </p>
                    <p>
                      {pickupDate} {t("summarySection.at")} {pickupTime}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleProceedToConfirm}
                  className="w-full bg-brand-red text-white py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors flex items-center justify-center gap-2"
                >
                  {t("detailsSection.btnReview")} <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="text-brand-dark/40 hover:text-brand-red transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="font-serif text-2xl text-brand-dark">
                  {t("confirmSection.title")}
                </h2>
              </div>

              <div className="bg-white p-5">
                <h3 className="font-semibold text-brand-dark mb-3">
                  {t("confirmSection.itemsTitle")}
                </h3>
                <div className="space-y-2">
                  {cart.map((line) => (
                    <div
                      key={line.cartLineId}
                      className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-brand-dark/70">
                        {line.item.name} × {line.qty}
                      </span>
                      <span className="text-brand-dark font-medium">
                        $
                        {(
                          (parseFloat(line.item.price) +
                            (line.customisation?.extraPrice ?? 0)) *
                          line.qty
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-brand-dark pt-2">
                    <span>{t("summarySection.totalLabel")}</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5">
                <h3 className="font-semibold text-brand-dark mb-3">
                  {t("confirmSection.pickupTitle")}
                </h3>
                <div className="space-y-2 text-sm text-brand-dark/70">
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={14}
                      className="text-brand-red mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="font-medium text-brand-dark">
                        {selectedStore?.name}
                      </p>
                      <p>{selectedStore?.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-brand-red flex-shrink-0" />
                    <span>
                      {pickupDate} {t("summarySection.at")} {pickupTime}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5">
                <h3 className="font-semibold text-brand-dark mb-3">
                  {t("confirmSection.contactTitle")}
                </h3>
                <div className="space-y-1.5 text-sm text-brand-dark/70">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-brand-red" />
                    <span>{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-brand-red" />
                    <span>{email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-brand-red" />
                    <span>{phone}</span>
                  </div>
                  {notes && (
                    <div className="mt-2 p-2 bg-brand-cream text-xs text-brand-dark/60 italic">
                      &ldquo;{notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={16} className="text-brand-red" />
                  <h3 className="font-semibold text-brand-dark">
                    {t("confirmSection.paymentTitle")}
                  </h3>
                </div>
                <p className="text-sm text-brand-dark/60 mb-3">
                  {t("confirmSection.paymentDesc")}
                </p>
                <div className="flex items-center gap-2 text-xs text-brand-dark/40">
                  <CheckCircle size={12} className="text-green-500" />
                  <span>{t("confirmSection.secureLabel")}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-5 sticky top-24">
                <h3 className="font-semibold text-brand-dark mb-4">
                  {t("summarySection.title")}
                </h3>
                <div className="space-y-2 mb-4">
                  {cart.map((line) => (
                    <div
                      key={line.cartLineId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-brand-dark/70">
                        {line.item.name} × {line.qty}
                      </span>
                      <span className="text-brand-dark font-medium">
                        $
                        {(
                          (parseFloat(line.item.price) +
                            (line.customisation?.extraPrice ?? 0)) *
                          line.qty
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 mb-5">
                  <div className="flex justify-between font-bold text-brand-dark text-xl">
                    <span>{t("summarySection.totalLabel")}</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-brand-dark/40 mt-1">
                    {t("confirmSection.gstIncludedNote")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isPlacing}
                  className="w-full bg-brand-red text-white py-4 font-bold text-base hover:bg-brand-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPlacing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("confirmSection.btnProcessing")}
                    </span>
                  ) : (
                    <>
                      <CreditCard size={16} />{" "}
                      {t("confirmSection.btnPay", {
                        total: cartTotal.toFixed(2),
                      })}
                    </>
                  )}
                </button>
                <p className="text-xs text-brand-dark/40 text-center mt-3">
                  {t("confirmSection.termsNote")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
