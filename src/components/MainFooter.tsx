import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { PORTAL_LINKS } from "@/config/nav-links";

import { FacebookIcon, InstagramIcon } from "@/components/icons/brand-icons";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useCart } from "@/contexts/CartContext";
import { useSiteSetting } from "@/contexts/SiteContentContext";

const Newsletter = dynamic(() => import("@/components/Newsletter"));
import { openCookieSettings } from "@/lib/cookie-consent";
import { LOGO_IMG_CLASS, LOGO_INTRINSIC, LOGO_URL } from "@/lib/site-images";

export default function MainFooter() {
  const t = useTranslations("Home");
  const { cartCount } = useCart();
  const facebookPageLink = useSiteSetting("facebook_page_link")?.trim();
  const instagramPageLink = useSiteSetting("instagram_page_link")?.trim();

  const footerQuickLinks = [
    { href: "/menu", label: t("footer.quickLinks.ourFood") },
    { href: "/our-story", label: t("footer.quickLinks.ourStory") },
    { href: "/catering", label: t("footer.quickLinks.catering") },
    { href: "/wholesale", label: t("footer.quickLinks.wholesaleShop") },
    { href: "/franchise", label: t("footer.quickLinks.franchise") },
    { href: "/careers", label: t("footer.quickLinks.careers") },
    { href: "/faq", label: t("footer.quickLinks.faq") },
  ] as const;

  const nutritionLinks = [
    { href: "/nutrition", label: "Nutrition" },
    { href: "/terms-of-service#food-safety", label: t("footer.foodSafety") },
    // { href: "/dietary", label: "Dietary" },
    // { href: "/allergen", label: "Allergen" },
  ] as const;

  return (
    <footer className="relative z-10 bg-brand-dark text-white/70">
      <div
        className={`max-w-[1280px] mx-auto px-4 pt-16 ${cartCount > 0 ? "pb-32" : "pb-8"}`}
      >
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12">
          {/* Brand col */}
          <div>
            <AppImage
              src={LOGO_URL}
              alt="Saigon Express Tasmania"
              width={LOGO_INTRINSIC.width}
              height={LOGO_INTRINSIC.height}
              className={`h-12 ${LOGO_IMG_CLASS} mb-5`}
            />
            <p className="text-sm leading-relaxed text-white/55 mb-5 max-w-xs">
              {t("footer.brandDescription")}
            </p>
            <div className="flex gap-3">
              {facebookPageLink ? (
                <a
                  href={facebookPageLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-colors"
                >
                  <FacebookIcon size={15} />
                </a>
              ) : null}
              {instagramPageLink ? (
                <a
                  href={instagramPageLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-colors"
                >
                  <InstagramIcon size={15} />
                </a>
              ) : null}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              {t("footer.quickLinksTitle")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {footerQuickLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              Nutrition, Dietry and Allergen
            </h3>
            <ul className="space-y-2.5 text-sm">
              {nutritionLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              {t("footer.portalsTitle")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {PORTAL_LINKS.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="hover:text-white transition-colors"
                  >
                    {t(`portals.${p.id}`)}
                  </Link>
                </li>
              ))}              
              <li>
                <Link
                  href="/news"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.news")}
                </Link>
              </li>
              {/* <li>
                <Link
                  href="/get-the-app"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.getTheApp")}
                </Link>
              </li> */}
            </ul>
            <ul className="mt-6 pt-6 border-t border-white/10 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="hover:text-white transition-colors"
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>              
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="hover:text-white transition-colors text-left"
                >
                  {t("footer.cookieSettings")}
                </button>
              </li>
            </ul>
          </div>

          <Newsletter />
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-4">
            <Link href="/stores" className="hover:text-white transition-colors">
              {t("footer.findStore")}
            </Link>
            <Link
              href="/careers"
              className="hover:text-white transition-colors"
            >
              {t("footer.careers")}
            </Link>
            <Link href="/faq" className="hover:text-white transition-colors">
              {t("footer.faq")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
