"use client";

import OrderInvoice from "@/components/OrderInvoice";
import OrderInvoicePrintView from "@/components/OrderInvoicePrintView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatInvoiceNumber } from "@/lib/order-invoice";
import type { TrackedOrder } from "@/lib/supabase/order-tracking";
import type { StoreLocation } from "@/types";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

type OrderInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: TrackedOrder;
  pickupStore?: StoreLocation | null;
  invoiceCreatorStore?: StoreLocation | null;
  statusLabel: string;
};

export default function OrderInvoiceDialog({
  open,
  onOpenChange,
  order,
  pickupStore = null,
  invoiceCreatorStore = null,
  statusLabel,
}: OrderInvoiceDialogProps) {
  const t = useTranslations("OrderTrackingDetails.invoice");
  const printSourceRef = useRef<HTMLDivElement>(null);
  const invoiceNumber =
    order.invoice_number?.trim() ||
    formatInvoiceNumber(order.id, order.created_at);

  const handlePrint = () => {
    const source = printSourceRef.current;
    if (!source) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0",
    );
    iframe.setAttribute("title", invoiceNumber);
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${invoiceNumber}</title>
<style>
@page { margin: 0; size: auto; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  height: auto;
  overflow: visible;
}
body {
  display: flex;
  justify-content: center;
}
</style>
</head>
<body>
${source.innerHTML}
</body>
</html>`);
    doc.close();

    const printFrame = () => {
      win.focus();
      win.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    const images = doc.getElementsByTagName("img");
    if (images.length === 0) {
      printFrame();
      return;
    }

    let loaded = 0;
    const onImageReady = () => {
      loaded += 1;
      if (loaded >= images.length) {
        printFrame();
      }
    };

    Array.from(images).forEach((img) => {
      if (img.complete) {
        onImageReady();
      } else {
        img.addEventListener("load", onImageReady);
        img.addEventListener("error", onImageReady);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="order-invoice-dialog flex max-h-[92vh] w-[calc(100%-1rem)] max-w-[920px] flex-col gap-0 overflow-hidden border-white/10 bg-[#f4f4f4] p-0 sm:max-w-[920px]"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("dialogTitle", { number: invoiceNumber })}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5">
            <OrderInvoice
              order={order}
              pickupStore={pickupStore}
              invoiceCreatorStore={invoiceCreatorStore}
              statusLabel={statusLabel}
            />
          </div>

          <DialogFooter className="shrink-0 border-t border-black/10 bg-white px-4 py-3 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
            <Button type="button" onClick={handlePrint}>
              <Printer />
              {t("print")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {open ? (
        <div
          ref={printSourceRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-[-9999px] top-0 h-0 w-[850px] overflow-hidden"
        >
          <OrderInvoicePrintView
            order={order}
            pickupStore={pickupStore}
            invoiceCreatorStore={invoiceCreatorStore}
          />
        </div>
      ) : null}
    </>
  );
}
