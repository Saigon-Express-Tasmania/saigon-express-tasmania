"use client";

import { buildOrderInvoiceViewModel } from "@/lib/order-invoice-data";
import {
  formatInvoiceSku,
  formatInvoiceUnit,
  getInvoiceTotalDiscount,
} from "@/lib/order-invoice";
import {
  formatTrackedCurrency,
  type TrackedOrder,
} from "@/lib/supabase/order-tracking";
import AppImage from "@/components/AppImage";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";
import type { StoreLocation } from "@/types";
import { useTranslations } from "next-intl";

type OrderInvoiceProps = {
  order: TrackedOrder;
  pickupStore?: StoreLocation | null;
  invoiceCreatorStore?: StoreLocation | null;
  statusLabel: string;
};

function SaigonExpressLogo({ compact = false }: { compact?: boolean }) {
  return (
    <AppImage
      src={LOGO_URL}
      alt="Saigon Express"
      width={LOGO_INTRINSIC.width}
      height={LOGO_INTRINSIC.height}
      className={`${LOGO_IMG_CLASS} shrink-0 ${compact ? "h-8" : "h-16"}`}
    />
  );
}

function AddressSection({
  title,
  block,
}: {
  title: string;
  block: { name: string; lines: string[] };
}) {
  return (
    <div className="w-[48%] text-[15px] leading-normal">
      <div className="mb-0.5 font-bold">{title}</div>
      <div>{block.name}</div>
      {block.lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

export default function OrderInvoice({
  order,
  pickupStore = null,
  invoiceCreatorStore = null,
}: OrderInvoiceProps) {
  const t = useTranslations("OrderTrackingDetails.invoice");
  const model = buildOrderInvoiceViewModel(order, {
    pickupStore,
    invoiceCreatorStore,
  });
  const { company } = model;
  const totalDiscount = getInvoiceTotalDiscount(order);

  return (
    <div className="font-[Arial,Helvetica,sans-serif] text-black antialiased">
      <div className="mx-auto max-w-[850px] bg-white p-10 shadow-[0_4px_15px_rgba(0,0,0,0.1)]">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <SaigonExpressLogo />
            <div className="mt-3 text-[15px] leading-normal">
              <div>{company.name}</div>
              {company.lines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className="mt-1">{t("phone", { value: company.phone })}</div>
              <div>{t("email", { value: company.email })}</div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="m-0 text-2xl text-black">{t("taxInvoice")}</h1>
            <h2 className="mt-1 text-[22px] text-black">
              {t("invoiceHeading", { number: model.invoiceNumber })}
            </h2>
            <div className="mt-3 text-base">
              {t("orderReference", { reference: model.orderReference })}
            </div>
            <div className="mt-2 text-[15px] leading-relaxed">
              <div>{t("dateOfIssue", { date: model.issueDate })}</div>
              <div>{t("dueDate", { date: model.dueDate })}</div>
            </div>
          </div>
        </div>

        <hr className="mb-5 border-0 border-t border-[#ddd]" />

        <div className="mb-6 flex justify-between text-[15px] leading-normal">
          <AddressSection title={t("billedTo")} block={model.billing} />
          <AddressSection title={t("shipTo")} block={model.shipping} />
        </div>

        <hr className="mb-5 border-0 border-t border-[#ddd]" />

        <table className="mb-2.5 w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-[#e8e8e8]">
              <th className="px-2 py-2.5 text-left font-bold">{t("sku")}</th>
              <th className="px-2 py-2.5 text-left font-bold">{t("description")}</th>
              <th className="px-2 py-2.5 text-center font-bold">{t("qty")}</th>
              <th className="px-2 py-2.5 text-center font-bold">{t("unit")}</th>
              <th className="px-2 py-2.5 text-right font-bold">{t("unitPrice")}</th>
              <th className="px-2 py-2.5 text-right font-bold">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="p-2">
                  {formatInvoiceSku(
                    item.sku || String(item.menu_item_id),
                    item.is_catch_weight,
                  )}
                </td>
                <td className="p-2">{item.item_name}</td>
                <td className="p-2 text-center">{item.qty}</td>
                <td className="p-2 text-center">
                  {formatInvoiceUnit(item.uom, item.is_catch_weight)}
                </td>
                <td className="p-2 text-right">
                  {formatTrackedCurrency(item.unit_price)}
                </td>
                <td className="bg-[#faeaea] p-2 text-right font-bold">
                  {formatTrackedCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-1 flex justify-end">
          <table className="w-[300px] border-collapse text-base">
            <tbody>
              <tr>
                <td className="py-1.5 pr-4 text-right font-bold">{t("subtotal")}</td>
                <td className="w-[100px] px-2 py-1.5 text-right font-bold">
                  {formatTrackedCurrency(order.subtotal)}
                </td>
              </tr>
              {totalDiscount > 0 ? (
                <tr>
                  <td className="py-1.5 pr-4 text-right font-bold">
                    {t("totalDiscount")}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-[#2d6a4f]">
                    −{formatTrackedCurrency(totalDiscount)}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td className="py-1.5 pr-4 text-right font-bold">{t("gst")}</td>
                <td className="px-2 py-1.5 text-right font-bold">
                  {formatTrackedCurrency(order.tax_total)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 pb-3 text-right font-bold">
                  {t("shippingFee")}
                </td>
                <td className="px-2 py-1.5 pb-3 text-right font-bold">
                  {formatTrackedCurrency(order.shipping_fee)}
                </td>
              </tr>
              <tr className="border-t border-[#ccc]">
                <td className="pt-3 pr-4 text-right text-lg font-bold">
                  {t("grandTotal")}
                </td>
                <td className="px-2 pt-3 text-right text-lg font-bold text-[#b52c34]">
                  {formatTrackedCurrency(order.grand_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-7 text-[15px] leading-relaxed">
          {model.hasCatchWeight ? (
            <p className="mb-2.5">{t("catchWeightNote")}</p>
          ) : null}
          <p className="m-0">{t(model.paymentNoteKey)}</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[850px] items-center justify-between bg-[#1e2025] px-10 py-6 text-white">
        <div className="max-w-[350px] text-sm leading-snug">
          {t("footerPayment", { email: company.email })}
        </div>

        <SaigonExpressLogo compact />
      </div>
    </div>
  );
}
