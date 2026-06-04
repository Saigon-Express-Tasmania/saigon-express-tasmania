import { cn } from "@/lib/utils";
import {
  Home,
  Inbox,
  Languages,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Settings,
  Star,
  Tags,
  Utensils,
  type LucideIcon
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group?: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Localization",
    href: "/localization",
    icon: Languages,
  },
  {
    title: "Menu",
    href: "/menu",
    icon: Utensils,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tags,
  },
  {
    title: "Promotions",
    href: "/promotions",
    icon: Megaphone,
  },
  {
    title: "Catering Packs",
    href: "/catering-packs",
    icon: Package,
  },
  {
    title: "Catering Boxes",
    href: "/catering-boxes",
    icon: Package,
  },
  {
    title: "Store Locations",
    href: "/store-locations",
    icon: MapPin,
  },
  {
    title: "Wholesale Products",
    href: "/wholesale-products",
    icon: Package,
  },
  {
    title: "Featured Reviews",
    href: "/featured-reviews",
    icon: Star,
  },
  {
    title: "Email templates",
    href: "/emails",
    icon: Mail,
  },
  {
    title: "Orders",
    href: "/sales/orders",
    icon: Inbox,
    group: "Sales",
  },
  {
    title: "Draft Orders",
    href: "/sales/draft-orders",
    icon: Inbox,
    group: "Sales",
  },
  {
    title: "Archived Orders",
    href: "/sales/archived-orders",
    icon: Inbox,
    group: "Sales",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function Sidebar() {
  const groupedItems = navItems.slice(1).reduce<Record<string, NavItem[]>>((acc, item) => {
    const group = item.group ?? "General";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col border-r bg-muted/10">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-xl font-bold">Saigon Express Tasmania</h2>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <NavLink to="/dashboard" className={navLinkClassName}>
          <Home className="h-5 w-5" />
          Dashboard
        </NavLink>        

        {Object.entries(groupedItems).map(([groupName, items]) => (
          <div key={groupName} className="space-y-1">
            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {groupName}
            </p>
            {items.map((item) => (
              <NavLink key={item.href} to={item.href} className={navLinkClassName}>
                <item.icon className="h-5 w-5" />
                {item.title}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">© 2026 CalyxGuru Admin</p>
      </div>
    </div>
  );
}
