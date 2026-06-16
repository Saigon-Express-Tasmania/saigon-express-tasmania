import type { AustralianStateCode } from "@/types/WholesaleB2BOrder";

export type CateringOrderReviewForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  event_date: string;
  guest_count: string;
  shipping_dba_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: AustralianStateCode | "";
  shipping_postal_code: string;
  shipping_country: string;
  shipping_preferred_window: string;
  notes: string | null;
  subtotal: number;
  coupon_code: string | null;
  coupon_discount: number;
  wholesale_discount: number;
  tax_total: number;
  shipping_fee: number;
  grand_total: number;
};
