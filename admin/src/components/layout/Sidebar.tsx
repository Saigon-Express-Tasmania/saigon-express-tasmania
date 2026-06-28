import { Button } from "@/components/ui/button";
import { SalesOrderModeSwitch } from "@/components/layout/SalesOrderModeSwitch";
import { useSalesOrderMode } from "@/contexts/SalesOrderModeContext";
import { cn } from "@/lib/utils";
import {
  Archive,
  Bell,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  FilePen,
  FileUser,
  FolderArchive,
  FolderTree,
  Gift,
  GraduationCap,
  Home,
  IceCreamBowl,
  Inbox,
  Languages,
  Library,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Newspaper,
  NotebookPen,
  Package,
  Percent,
  PhoneCall,
  Settings,
  ShoppingCart,
  Star,
  Tags,
  Truck,
  UserRoundSearch,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

const SIDEBAR_COMPACT_KEY = "admin-sidebar-compact";
const SIDEBAR_SCROLL_KEY = "admin-sidebar-scroll-top";

let persistedSidebarScrollTop = 0;

try {
  const stored = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
  if (stored !== null) {
    const parsed = Number.parseInt(stored, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      persistedSidebarScrollTop = parsed;
    }
  }
} catch {
  // ignore storage errors
}

function persistSidebarScroll(scrollTop: number) {
  persistedSidebarScrollTop = scrollTop;
  try {
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollTop));
  } catch {
    // ignore storage errors
  }
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  isOrderPage?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Menu",
    href: "/menu",
    icon: Utensils,
    group: "Products",
  },
  {
    title: "Wholesale Products",
    href: "/wholesale-products",
    icon: Truck,
    group: "Products",
  },
  {
    title: "Catering Packs",
    href: "/catering-packs",
    icon: Gift,
    group: "Products",
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tags,
    group: "Products",
  },
  {
    title: "Customizations",
    href: "/customizations",
    icon: IceCreamBowl,
    group: "Products",
  },
  {
    title: "Orders",
    href: "/sales/orders/catering",
    icon: ShoppingCart,
    group: "Catering",
    isOrderPage: true,
  },
  {
    title: "Draft Orders",
    href: "/sales/draft-orders/catering",
    icon: FilePen,
    group: "Catering",
    isOrderPage: true,
  },
  {
    title: "Archived Orders",
    href: "/sales/archived-orders/catering",
    icon: Archive,
    group: "Catering",
    isOrderPage: true,
  },  
  {
    title: "Enquiries",
    href: "/interests/catering_enquiries",
    icon: MessageSquare,
    group: "Catering",
    isOrderPage: false,
  },
  {
    title: "Orders",
    href: "/sales/orders/wholesale",
    icon: Package,
    group: "Wholesale",
    isOrderPage: true,
  },
  {
    title: "Draft Orders",
    href: "/sales/draft-orders/wholesale",
    icon: NotebookPen,
    group: "Wholesale",
    isOrderPage: true,
  },
  {
    title: "Archived Orders",
    href: "/sales/archived-orders/wholesale",
    icon: FolderArchive,
    group: "Wholesale",
    isOrderPage: true,
  },
  {
    title: "Enquiries",
    href: "/wholesale_enquiries",
    icon: Inbox,
    group: "Wholesale",
    isOrderPage: false,
  },
  {
    title: "Franchise Interests",
    href: "/interests/franchise",
    icon: Building2,
    group: "Contact",
  },
  {
    title: "Consultations",
    href: "/interests/consultation",
    icon: PhoneCall,
    group: "Contact",
  },  
  {
    title: "Partners",
    href: "/partners",
    icon: UserRoundSearch,
    group: "Contact",
  },
  {
    title: "Feedbacks",
    href: "/feedbacks",
    icon: MessageCircle,
    group: "Contact",
  },
  {
    title: "Job Applications",
    href: "/job-applications",
    icon: FileUser,
    group: "Contact",
  },  
  {
    title: "Promotions",
    href: "/promotions",
    icon: Megaphone,
    group: "Content",
  },  
  {
    title: "Store Locations",
    href: "/store-locations",
    icon: MapPin,
    group: "Content",
  },  
  {
    title: "Wholesale Tiers",
    href: "/wholesale-tiers",
    icon: Percent,
    group: "Content",
  },
  {
    title: "Blog Posts",
    href: "/blog-posts",
    icon: Newspaper,
    group: "Content",
  },
  {
    title: "Featured Reviews",
    href: "/featured-reviews",
    icon: Star,
    group: "Content",
  },  
  {
    title: "Job Listings",
    href: "/job-listings",
    icon: Briefcase,
    group: "Content",
  },
  {
    title: "Announcements",
    href: "/franchise/announcements",
    icon: Bell,
    group: "Franchise Resources",
  },
  {
    title: "Resources Hub",
    href: "/franchise/resources-hub",
    icon: Library,
    group: "Franchise Resources",
  },
  {
    title: "Menu Academy",
    href: "/franchise/menu-academy",
    icon: GraduationCap,
    group: "Franchise Resources",
  },
  {
    title: "Taxonomies",
    href: "/franchise/taxonomies",
    icon: FolderTree,
    group: "Franchise Resources",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    group: "Master",
  },
  {
    title: "Localization",
    href: "/localization",
    icon: Languages,
    group: "Master",
  },
  {
    title: "Email templates",
    href: "/emails",
    icon: Mail,
    group: "Master",
  },
];

const navLinkClassName =
  (compact: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
      compact ? "justify-center px-2" : "gap-3 px-3",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

type NavSection =
  | { kind: "link"; item: NavItem }
  | { kind: "group"; name: string; items: NavItem[] };

/** Preserves navItems order; group sections appear where the group first appears in the array. */
function buildNavSections(items: NavItem[]): NavSection[] {
  const sections: NavSection[] = [];
  const groupIndex = new Map<string, number>();

  for (const item of items) {
    if (!item.group) {
      sections.push({ kind: "link", item });
      continue;
    }

    let index = groupIndex.get(item.group);
    if (index === undefined) {
      index = sections.length;
      groupIndex.set(item.group, index);
      sections.push({ kind: "group", name: item.group, items: [] });
    }

    const section = sections[index];
    if (section.kind === "group") {
      section.items.push(item);
    }
  }

  return sections;
}

function getNavTitle(item: NavItem, testMode: boolean): string {
  if (testMode && item.isOrderPage) {
    return `${item.title} Test`;
  }
  return item.title;
}

function NavItemLink({
  item,
  compact,
  testMode,
}: {
  item: NavItem;
  compact: boolean;
  testMode: boolean;
}) {
  const title = getNavTitle(item, testMode);

  return (
    <NavLink
      to={item.href}
      className={navLinkClassName(compact)}
      title={compact ? title : undefined}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!compact && <span>{title}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { mode } = useSalesOrderMode();
  const testMode = mode === 'test';
  const navRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COMPACT_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [dashboard, ...rest] = navItems;
  const sections = buildNavSections(rest);

  const toggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COMPACT_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (nav) {
      nav.scrollTop = persistedSidebarScrollTop;
    }
  }, []);

  const handleNavScroll = () => {
    const nav = navRef.current;
    if (nav) {
      persistSidebarScroll(nav.scrollTop);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-muted/10 transition-[width] duration-200",
        compact ? "w-[4.5rem]" : "w-64",
      )}
    >
      {!compact && (
        <div className="flex h-16 shrink-0 items-center border-b px-4">
          <img
            src="/images/logo.png"
            alt="Saigon Express"
            className="h-10 w-auto max-w-full object-contain object-left"
          />
        </div>
      )}

      <nav
        ref={navRef}
        onScroll={handleNavScroll}
        className={cn(
          "flex-1 space-y-1 overflow-y-auto overflow-anchor-none",
          compact ? "p-2 pt-3" : "p-4",
        )}
      >
        <NavItemLink item={dashboard} compact={compact} testMode={testMode} />

        {sections.map((section) =>
          section.kind === "link" ? (
            <NavItemLink
              key={section.item.href}
              item={section.item}
              compact={compact}
              testMode={testMode}
            />
          ) : (
            <div key={section.name} className="space-y-1">
              {!compact && (
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.name}
                </p>
              )}
              {section.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  compact={compact}
                  testMode={testMode}
                />
              ))}
            </div>
          ),
        )}
      </nav>

      <div className={cn("shrink-0 border-t", compact ? "p-2" : "p-4", "w-full")}>        
        <div className="mb-2 flex justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(compact ? "h-9 px-0" : "justify-start")}
            onClick={toggleCompact}
            title={compact ? "Expand sidebar" : "Compact sidebar"}
          >
            {compact ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Compact</span>
              </>
            )}
          </Button>
          <div className="mb-2">
            <SalesOrderModeSwitch />
          </div>
        </div>
        {!compact && (
          <p className="mt-3 text-xs text-muted-foreground">
            © 2026 CalyxGuru Admin
          </p>
        )}        
      </div>
    </div>
  );
}
