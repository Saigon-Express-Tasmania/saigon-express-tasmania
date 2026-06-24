import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import {
  MEMBER_PORTAL_LIGHT_BOX_SURFACE,
  MEMBER_PORTAL_LIGHT_PANEL_CLASS,
} from "@/lib/member-portal-surfaces";
import { Loader2 } from "lucide-react";
import { formatAud } from "./format-aud";

export type RecentReorderItem = {
  key: string;
  productId: number;
  itemName: string;
  category: string;
  qty: number;
  unitPrice: number;
  imageUrl: string | null;
  unit: string | null;
  isAvailable: boolean;
};

export type MemberDashboardReorderSectionProps = {
  loadingData: boolean;
  items: RecentReorderItem[];
  onReorderItem: (item: RecentReorderItem) => void;
};

export default function MemberDashboardReorderSection({
  loadingData,
  items,
  onReorderItem,
}: MemberDashboardReorderSectionProps) {
  return (
    <div className={`${MEMBER_PORTAL_LIGHT_PANEL_CLASS} p-5`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-900">
          Reorder Recent Items
        </h2>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading recent items…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">
          No recent orders to reorder.{" "}
          <Link
            href="/wholesale/shop"
            className="text-primary underline underline-offset-2"
          >
            Browse the shop
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.key}
              className={`rounded-xl border border-gray-200 p-3 ${MEMBER_PORTAL_LIGHT_BOX_SURFACE}`}
            >
              <div className="mb-3 flex gap-2.5">
                <div className="h-[50px] w-[50px] shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.imageUrl ? (
                    <AppImage
                      src={item.imageUrl}
                      alt={item.itemName}
                      width={50}
                      height={50}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {item.itemName}
                  </div>
                  <div className="text-[11px] leading-snug text-gray-500">
                    {item.category}
                    <br />
                    {item.unit ? `Unit: ${item.unit}` : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">
                  Priced{" "}
                  <span className="font-bold text-primary">
                    {formatAud(item.unitPrice)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onReorderItem(item)}
                  disabled={!item.isAvailable}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
