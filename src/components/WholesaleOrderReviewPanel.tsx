"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import type { WholesaleCartItem } from "@/contexts/WholesaleCartContext";
import {
  billingAddressFromShipping,
  isBillingSameAsShipping,
} from "@/lib/wholesale-b2b-order";
import type { WholesaleB2BCheckoutPayload } from "@/types/WholesaleB2BOrder";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function WholesaleOrderReviewPanel({
  items,
  financialDetails,
  b2b,
  onB2bChange,
  onBack,
  onConfirm,
  isCheckingOut,
}: {
  items: WholesaleCartItem[];
  financialDetails: WholesaleB2BCheckoutPayload["financialDetails"];
  b2b: WholesaleB2BCheckoutPayload;
  onB2bChange: (next: WholesaleB2BCheckoutPayload) => void;
  onBack: () => void;
  onConfirm: () => void;
  isCheckingOut: boolean;
}) {
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(() =>
    isBillingSameAsShipping(b2b.shippingAddress, b2b.billingAddress),
  );

  const updateShipping = (
    patch: Partial<WholesaleB2BCheckoutPayload["shippingAddress"]>,
  ) => {
    const nextShipping = { ...b2b.shippingAddress, ...patch };
    onB2bChange({
      ...b2b,
      shippingAddress: nextShipping,
      billingAddress: billingSameAsShipping
        ? billingAddressFromShipping(nextShipping, b2b.billingAddress)
        : b2b.billingAddress,
    });
  };

  const updateBilling = (
    patch: Partial<WholesaleB2BCheckoutPayload["billingAddress"]>,
  ) => {
    onB2bChange({
      ...b2b,
      billingAddress: { ...b2b.billingAddress, ...patch },
    });
  };

  const handleBillingSameAsShippingChange = (checked: boolean) => {
    setBillingSameAsShipping(checked);
    if (checked) {
      onB2bChange({
        ...b2b,
        billingAddress: billingAddressFromShipping(
          b2b.shippingAddress,
          b2b.billingAddress,
        ),
      });
    }
  };

  const updateBuyer = (patch: Partial<WholesaleB2BCheckoutPayload["buyer"]>) => {
    onB2bChange({
      ...b2b,
      buyer: { ...b2b.buyer, ...patch },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <button
          type="button"
          onClick={onBack}
          disabled={isCheckingOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-40"
          aria-label="Back to cart"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-serif text-xl font-bold text-white">
            Review order
          </h2>
          <p className="text-xs text-white/45">
            Confirm details before secure payment
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Order items</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <WholesaleCartItemThumbnail
                  imageUrl={item.imageUrl}
                  alt={item.productName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.productName}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {item.qty} × ${Number(item.unitPrice).toFixed(2)} ex GST
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Subtotal (ex GST)</span>
            <span className="tabular-nums text-white">
              ${financialDetails.subtotal_ex_gst.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>GST (10%)</span>
            <span className="tabular-nums text-white">
              ${financialDetails.gst_total.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
            <span>Total (inc GST)</span>
            <span className="tabular-nums text-primary">
              ${financialDetails.grand_total_inc_gst.toFixed(2)}
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Buyer</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={fieldClass}
                value={b2b.buyer.name}
                onChange={(e) => updateBuyer({ name: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <input
                className={fieldClass}
                value={b2b.buyer.role ?? ""}
                onChange={(e) => updateBuyer({ role: e.target.value })}
                placeholder="e.g. Head Chef"
              />
            </Field>
            <Field label="Phone">
              <input
                className={fieldClass}
                value={b2b.buyer.contact_phone}
                onChange={(e) => updateBuyer({ contact_phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={fieldClass}
                value={b2b.buyer.contact_email ?? ""}
                onChange={(e) => updateBuyer({ contact_email: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Shipping address</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business / DBA name">
              <input
                className={fieldClass}
                value={b2b.shippingAddress.dba_name}
                onChange={(e) => updateShipping({ dba_name: e.target.value })}
              />
            </Field>
            <Field label="City">
              <input
                className={fieldClass}
                value={b2b.shippingAddress.city}
                onChange={(e) => updateShipping({ city: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Street address">
                <input
                  className={fieldClass}
                  value={b2b.shippingAddress.street_1}
                  onChange={(e) => updateShipping({ street_1: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Street line 2">
                <input
                  className={fieldClass}
                  value={b2b.shippingAddress.street_2 ?? ""}
                  onChange={(e) =>
                    updateShipping({ street_2: e.target.value || null })
                  }
                />
              </Field>
            </div>
            <Field label="State">
              <input
                className={fieldClass}
                value={b2b.shippingAddress.state ?? ""}
                onChange={(e) =>
                  updateShipping({ state: e.target.value || null })
                }
              />
            </Field>
            <Field label="Postal code">
              <input
                className={fieldClass}
                value={b2b.shippingAddress.postal_code}
                onChange={(e) => updateShipping({ postal_code: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Delivery instructions">
                <textarea
                  className={`${fieldClass} min-h-[72px] resize-y`}
                  value={b2b.shippingAddress.special_instructions ?? ""}
                  onChange={(e) =>
                    updateShipping({
                      special_instructions: e.target.value || null,
                    })
                  }
                  placeholder="Loading dock, access codes, etc."
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Preferred delivery window">
                <input
                  className={fieldClass}
                  value={b2b.shippingAddress.preferred_window ?? ""}
                  onChange={(e) =>
                    updateShipping({
                      preferred_window: e.target.value || null,
                    })
                  }
                  placeholder="e.g. 06:00 - 09:30"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Billing address</h3>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={billingSameAsShipping}
                onChange={(e) =>
                  handleBillingSameAsShippingChange(e.target.checked)
                }
                disabled={isCheckingOut}
                className="h-4 w-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/40"
              />
              Same as shipping address
            </label>
          </div>
          {billingSameAsShipping ? (
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/45">
              Billing address matches shipping. Tax ID and payment terms still
              apply below.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {!billingSameAsShipping ? (
              <>
                <Field label="Legal name">
                  <input
                    className={fieldClass}
                    value={b2b.billingAddress.legal_name}
                    onChange={(e) =>
                      updateBilling({ legal_name: e.target.value })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Street address">
                    <input
                      className={fieldClass}
                      value={b2b.billingAddress.street_1}
                      onChange={(e) =>
                        updateBilling({ street_1: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Street line 2">
                    <input
                      className={fieldClass}
                      value={b2b.billingAddress.street_2 ?? ""}
                      onChange={(e) =>
                        updateBilling({ street_2: e.target.value || null })
                      }
                    />
                  </Field>
                </div>
                <Field label="City">
                  <input
                    className={fieldClass}
                    value={b2b.billingAddress.city}
                    onChange={(e) => updateBilling({ city: e.target.value })}
                  />
                </Field>
                <Field label="Postal code">
                  <input
                    className={fieldClass}
                    value={b2b.billingAddress.postal_code}
                    onChange={(e) =>
                      updateBilling({ postal_code: e.target.value })
                    }
                  />
                </Field>
              </>
            ) : null}
            <Field label="Tax ID / ABN">
              <input
                className={fieldClass}
                value={b2b.billingAddress.tax_id ?? ""}
                onChange={(e) =>
                  updateBilling({ tax_id: e.target.value || null })
                }
              />
            </Field>
            <Field label="Payment terms">
              <input
                className={fieldClass}
                value={b2b.billingAddress.payment_terms ?? ""}
                onChange={(e) =>
                  updateBilling({ payment_terms: e.target.value || null })
                }
                readOnly
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isCheckingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay ${financialDetails.grand_total_inc_gst.toFixed(2)} with Card
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-white/30">
          Secure payment via Stripe · Card & Apple Pay accepted
        </p>
      </div>
    </div>
  );
}
