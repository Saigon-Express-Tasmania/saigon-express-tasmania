import { cn } from "@/lib/utils";
import {
  Home,
  Languages,
  MapPin,
  Megaphone,
  Package,
  Settings,
  Star,
  Utensils,
  type LucideIcon
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
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
    title: "Promotions",
    href: "/promotions",
    icon: Megaphone,
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

        {navItems.slice(1).map((item) => (
          <NavLink key={item.href} to={item.href} className={navLinkClassName}>
            <item.icon className="h-5 w-5" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">© 2026 CalyxGuru Admin</p>
      </div>
    </div>
  );
}
