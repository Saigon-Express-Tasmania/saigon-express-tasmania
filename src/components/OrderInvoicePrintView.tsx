"use client";

import type { CSSProperties } from "react";
import { buildOrderInvoiceViewModel } from "@/lib/order-invoice-data";
import {
  formatInvoiceSku,
  formatInvoiceUnit,
  getInvoiceTotalDiscount,
} from "@/lib/order-invoice";
import { formatTrackedCurrency, type TrackedOrder } from "@/lib/supabase/order-tracking";
import { LOGO_URL } from "@/lib/site-images";
import type { StoreLocation } from "@/types";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

type OrderInvoicePrintViewProps = {
  order: TrackedOrder;
  pickupStore?: StoreLocation | null;
  invoiceCreatorStore?: StoreLocation | null;
};

const pageStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  margin: 0,
  padding: 0,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#000",
  WebkitFontSmoothing: "antialiased",
  printColorAdjust: "exact",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "850px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  padding: "40px",
  boxShadow: "none",
  border: "none",
  boxSizing: "border-box",
};

const footerStyle: CSSProperties = {
  width: "100%",
  maxWidth: "850px",
  margin: "0 auto",
  backgroundColor: "#1e2025",
  color: "#ffffff",
  padding: "25px 40px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxSizing: "border-box",
};

function AddressBlock({
  title,
  name,
  lines,
}: {
  title: string;
  name: string;
  lines: string[];
}) {
  return (
    <div style={{ width: "48%", lineHeight: 1.5, fontSize: "15px" }}>
      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{title}</div>
      <div>{name}</div>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

export default function OrderInvoicePrintView({
  order,
  pickupStore = null,
  invoiceCreatorStore = null,
}: OrderInvoicePrintViewProps) {
  const t = useTranslations("OrderTrackingDetails.invoice");
  const model = buildOrderInvoiceViewModel(order, {
    pickupStore,
    invoiceCreatorStore,
  });
  const { company } = model;
  const totalDiscount = getInvoiceTotalDiscount(order);
  const logoSrc = useMemo(
    () =>
      typeof window !== "undefined"
        ? new URL(LOGO_URL, window.location.origin).href
        : LOGO_URL,
    [],
  );

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "30px",
          }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Saigon Express"
              style={{ display: "block", height: "64px", width: "auto" }}
            />
            <div style={{ marginTop: "12px", fontSize: "15px", lineHeight: 1.5 }}>
              <div>{company.name}</div>
              {company.lines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div style={{ marginTop: "4px" }}>
                {t("phone", { value: company.phone })}
              </div>
              <div>{t("email", { value: company.email })}</div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: 0, fontSize: "24px", color: "#000" }}>
              {t("taxInvoice")}
            </h1>
            <h2 style={{ margin: "5px 0 0 0", fontSize: "22px", color: "#000" }}>
              {t("invoiceHeading", { number: model.invoiceNumber })}
            </h2>
            <div style={{ marginTop: "12px", fontSize: "16px" }}>
              {t("orderReference", { reference: model.orderReference })}
            </div>
            <div style={{ marginTop: "8px", fontSize: "15px", lineHeight: 1.6 }}>
              <div>{t("dateOfIssue", { date: model.issueDate })}</div>
              <div>{t("dueDate", { date: model.dueDate })}</div>
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "0 0 20px 0" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "25px",
          }}
        >
          <AddressBlock
            title={t("billedTo")}
            name={model.billing.name}
            lines={model.billing.lines}
          />
          <AddressBlock
            title={t("shipTo")}
            name={model.shipping.name}
            lines={model.shipping.lines}
          />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "0 0 20px 0" }} />

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "10px",
            fontSize: "15px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#e8e8e8" }}>
              <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: "bold" }}>
                {t("sku")}
              </th>
              <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: "bold" }}>
                {t("description")}
              </th>
              <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "bold" }}>
                {t("qty")}
              </th>
              <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "bold" }}>
                {t("unit")}
              </th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontWeight: "bold" }}>
                {t("unitPrice")}
              </th>
              <th style={{ padding: "10px 8px", textAlign: "right", fontWeight: "bold" }}>
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: "8px" }}>
                  {formatInvoiceSku(
                    item.sku || String(item.menu_item_id),
                    item.is_catch_weight,
                  )}
                </td>
                <td style={{ padding: "8px" }}>{item.item_name}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{item.qty}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  {formatInvoiceUnit(item.uom, item.is_catch_weight)}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {formatTrackedCurrency(item.unit_price)}
                </td>
                <td
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    backgroundColor: "#faeaea",
                    fontWeight: "bold",
                  }}
                >
                  {formatTrackedCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "5px" }}>
          <table style={{ width: "300px", borderCollapse: "collapse", fontSize: "16px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "6px 15px 6px 0", textAlign: "right", fontWeight: "bold" }}>
                  {t("subtotal")}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    fontWeight: "bold",
                    width: "100px",
                  }}
                >
                  {formatTrackedCurrency(order.subtotal)}
                </td>
              </tr>
              {totalDiscount > 0 ? (
                <tr>
                  <td
                    style={{
                      padding: "6px 15px 6px 0",
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    {t("totalDiscount")}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: "#2d6a4f",
                    }}
                  >
                    −{formatTrackedCurrency(totalDiscount)}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td style={{ padding: "6px 15px 6px 0", textAlign: "right", fontWeight: "bold" }}>
                  {t("gst")}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>
                  {formatTrackedCurrency(order.tax_total)}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "6px 15px 12px 0",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {t("shippingFee")}
                </td>
                <td
                  style={{
                    padding: "6px 8px 12px 8px",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {formatTrackedCurrency(order.shipping_fee)}
                </td>
              </tr>
              <tr style={{ borderTop: "1px solid #ccc" }}>
                <td
                  style={{
                    padding: "12px 15px 0 0",
                    textAlign: "right",
                    fontWeight: "bold",
                    fontSize: "18px",
                  }}
                >
                  {t("grandTotal")}
                </td>
                <td
                  style={{
                    padding: "12px 8px 0 8px",
                    textAlign: "right",
                    fontWeight: "bold",
                    fontSize: "18px",
                    color: "#b52c34",
                  }}
                >
                  {formatTrackedCurrency(order.grand_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "30px", fontSize: "15px", lineHeight: 1.6 }}>
          {model.hasCatchWeight ? (
            <p style={{ margin: "0 0 10px 0" }}>{t("catchWeightNote")}</p>
          ) : null}
          <p style={{ margin: 0 }}>{t(model.paymentNoteKey)}</p>
        </div>
      </div>

      <div style={footerStyle}>
        <div style={{ fontSize: "14px", lineHeight: 1.4, maxWidth: "350px" }}>
          {t("footerPayment", { email: company.email })}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="Saigon Express"
          style={{ display: "block", height: "32px", width: "auto" }}
        />
      </div>
    </div>
  );
}
