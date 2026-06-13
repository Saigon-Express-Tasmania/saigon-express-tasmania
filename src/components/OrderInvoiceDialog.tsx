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
import { createPortal } from "react-dom";

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
  const invoiceNumber = formatInvoiceNumber(order.id, order.created_at);

  const handlePrint = () => {
    window.print();
  };

  const printSurface =
    open && typeof document !== "undefined"
      ? createPortal(
          <div id="order-invoice-print-root" aria-hidden="true">
            <OrderInvoicePrintView
              order={order}
              pickupStore={pickupStore}
              invoiceCreatorStore={invoiceCreatorStore}
            />
          </div>,
          document.body,
        )
      : null;

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

      {printSurface}
    </>
  );
}
