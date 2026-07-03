"use client";

import Link from "@/components/link";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";

const TERMS_SECTION_LINKS = [
  { href: "#food-safety", label: "Food Safety" },
  { href: "#agreement-to-terms", label: "Agreement" },
  { href: "#orders-pricing-payments", label: "Orders & Payments" },
  { href: "#catering-terms", label: "Catering Orders" },
  { href: "#dietary-allergens", label: "Dietary & Allergens" },
  { href: "#platform-conduct", label: "Platform Conduct" },
  { href: "#intellectual-property", label: "Intellectual Property" },
  { href: "#third-party-links", label: "Third-Party Links" },
  { href: "#limitation-of-liability", label: "Liability" },
  { href: "#governing-law", label: "Governing Law" },
  { href: "#terms-changes", label: "Changes" },
  { href: "#contact-us", label: "Contact" },
] as const;

const heroLinkClassName =
  "text-stone-300 underline underline-offset-4 transition-colors hover:text-white";

function TermsSectionNav() {
  return (
    <nav
      aria-label="Terms sections"
      className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm"
    >
      {TERMS_SECTION_LINKS.map((link, index) => (
        <Fragment key={link.href}>
          {index > 0 ? (
            <span className="px-1 text-stone-600" aria-hidden>
              ·
            </span>
          ) : null}
          <Link href={link.href} className={heroLinkClassName}>
            {link.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}

const CATERING_TERMS_ITEMS = [
  {
    id: "order-timing",
    title: "Order timing",
    content: (
      <p>
        24 hours notice is recommended. Clients acknowledge that less than 24
        hours notice may result in unavailability of some items. In the case of
        large orders, more than 24 hours notice may be required. We do our best
        to accommodate short-notice catering. All items are subject to
        availability on short notice. Same-day ordering or orders below the
        minimum may attract a 10% surcharge.
      </p>
    ),
  },
  {
    id: "presentation",
    title: "Presentation",
    content: (
      <p>
        All catering orders are presented on black foam trays or in window
        boxes. Stainless steel platters, timber planks, or timber boards can be
        provided and will incur a hire charge. Breakages or loss must be paid
        for at replacement cost.
      </p>
    ),
  },
  {
    id: "delivery",
    title: "Delivery",
    content: (
      <p>
        Catering orders can be collected or delivered. Delivery charges apply in
        all cases. The price for delivery can be quoted upon ordering.
      </p>
    ),
  },
  {
    id: "cancellations",
    title: "Cancellations",
    content: (
      <p>
        We require a minimum of 24 hours notice to avoid a late-cancellation
        penalty on most orders. Late cancellation notice (4 hours or less) will
        incur a 50% charge of the total order.
      </p>
    ),
  },
  {
    id: "prices",
    title: "Prices",
    content: (
      <p>
        Prices are subject to change without notice; however, prices are
        guaranteed at the time your order is confirmed. All prices include GST.
        A tax invoice will be issued on the day of delivery or collection. A 15%
        public holiday surcharge and a 1.9% American Express surcharge apply
        where relevant.
      </p>
    ),
  },
  {
    id: "deposits",
    title: "Deposits",
    content: (
      <p>
        Custom catering events may require payment of a deposit to confirm the
        event. You will be advised of this when your quote is provided.
      </p>
    ),
  },
] as const;

function TermsAccordion({
  items,
}: {
  items: readonly {
    id: string;
    title: string;
    content: ReactNode;
  }[];
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white shadow-sm">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} id={`catering-${item.id}`} className="scroll-mt-24">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`catering-panel-${item.id}`}
              onClick={() =>
                setOpenId((current) => (current === item.id ? null : item.id))
              }
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-stone-50"
            >
              <span className="text-sm font-semibold tracking-wide text-stone-900 uppercase">
                {item.title}
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-red-700 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>
            {isOpen ? (
              <div
                id={`catering-panel-${item.id}`}
                className="border-t border-stone-100 px-4 pb-4 pt-1 text-stone-600 leading-relaxed"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">
        {title}
      </h2>
      <div className="space-y-4 text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-stone-800 mt-6 mb-2">{children}</h3>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-red-700">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsOfService() {
  const contactEmail = useSiteSetting("contact_us_email")?.trim();

  useEffect(() => {
    const scrollToHash = () => {
      const { hash } = window.location;
      if (!hash) return;
      requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-red-700 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Legal
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Terms of Service
          </h1>
          <p className="text-stone-400 text-sm">Effective Date: June 20, 2026</p>
          <TermsSectionNav />
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-10">
        <Section id="food-safety" title="Food Safety Information">
          <p>
            Tognini&rsquo;s Catering follows all relevant food safety guidelines
            as outlined by Queensland Health and Food Standards Australia New
            Zealand (FSANZ) to ensure all food is prepared and delivered under
            safe, hygienic conditions.
          </p>
          <p>
            Once your catering order has been delivered or collected, it becomes
            the responsibility of the customer to ensure food safety is
            maintained.
          </p>
          <p>To reduce the risk of foodborne illness, please note the following:</p>
          <BulletList
            items={[
              <>
                Perishable foods should be consumed within 2 hours of delivery if
                not refrigerated.
              </>,
              <>
                Hot food is delivered warm and should be consumed within 1 hour
                of delivery to ensure optimal quality and food safety.
              </>,
              <>
                If food will not be consumed immediately, it should be
                refrigerated at or below 5&deg;C as soon as possible.
              </>,
              <>
                If reheating is required, ensure food is heated thoroughly to at
                least 75&deg;C before serving and consumed within 2 hours of
                reheating.
              </>,
              <>
                Once reheated, food should not be cooled and reheated again.
              </>,
            ]}
          />
          <p>
            Tognini&rsquo;s Catering cannot accept responsibility for food safety
            concerns arising from improper storage, handling, or consumption once
            the order has been delivered or collected.
          </p>
          <p>
            By accepting delivery or collection, the customer acknowledges they
            understand and accept responsibility for following safe food handling
            practices.
          </p>
        </Section>

        <div className="space-y-4 text-stone-600 leading-relaxed">
          <p>
            Welcome to Saigon Express. These Terms of Service
            (&ldquo;Terms&rdquo;) govern your access to and use of the
            saigonexpress.com.au website, our Progressive Web App (PWA), and any
            related online services, including wholesale, catering, and franchise
            portals (collectively, the &ldquo;Platform&rdquo;). The Platform is
            owned and operated by TTH Enterprises Pty Ltd (ABN 60 650 289 991)
            (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;).
          </p>
          <p>
            By accessing or using our Platform, you agree to be bound by these
            Terms. If you do not agree with any part of these Terms, you must
            not use our Platform.
          </p>
        </div>

        <Section id="agreement-to-terms" title="1. Agreement to Terms">
          <p>
            By using the Platform to browse our menu, place an order, or submit
            an inquiry, you represent that you are legally capable of entering
            into binding contracts. If you are using the Platform on behalf of a
            business (e.g., through our Wholesale or Franchise portals), you
            represent that you have the authority to bind that business to these
            Terms.
          </p>
        </Section>

        <Section id="orders-pricing-payments" title="2. Orders, Pricing, and Payments">
          <Subheading>Menu and Pricing:</Subheading>
          <p>
            All prices are listed in Australian Dollars (AUD) and include Goods
            and Services Tax (GST) where applicable. We reserve the right to
            change prices, menu items, and availability at any time without
            prior notice. Catering orders may also be subject to surcharges
            outlined in the{" "}
            <Link
              href="#catering-terms"
              className="text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              Catering Orders
            </Link>{" "}
            section below.
          </p>

          <Subheading>Order Acceptance:</Subheading>
          <p>
            Placing an order through our Platform constitutes an offer to
            purchase. We reserve the right to accept or decline any order for any
            reason, including but not limited to ingredient unavailability,
            errors in pricing, or technical issues.
          </p>

          <Subheading>Payment:</Subheading>
          <p>
            Full payment is required at the time of placing an online order. We
            use secure third-party payment gateways (e.g., Stripe, Square). By
            submitting your payment details, you authorize us to charge the
            applicable order total to your nominated payment method.
          </p>

          <Subheading>Cancellations and Refunds:</Subheading>
          <p>
            Due to the perishable nature of our products, cancellations or
            modifications to orders must be made as soon as possible by
            contacting the Saigon Express location fulfilling your order. Refunds
            are issued at our sole discretion or as required by the Australian
            Consumer Law (ACL). Catering orders are also subject to the
            cancellation terms in the{" "}
            <Link
              href="#catering-cancellations"
              className="text-red-700 underline underline-offset-2 hover:text-red-800"
            >
              Catering Orders
            </Link>{" "}
            section.
          </p>
        </Section>

        <Section id="catering-terms" title="Catering Orders">
          <p>
            The following terms apply specifically to catering orders placed
            through Saigon Express. Expand each topic for full details.
          </p>
          <TermsAccordion items={CATERING_TERMS_ITEMS} />
        </Section>

        <Section id="dietary-allergens" title="3. Dietary Requirements and Allergens">
          <Subheading>Allergen Warning:</Subheading>
          <p>
            While we take reasonable precautions to accommodate dietary
            requirements, our kitchens handle allergens such as peanuts, tree
            nuts, seafood, soy, dairy, egg, and gluten.
          </p>

          <Subheading>Cross-Contamination:</Subheading>
          <p>
            We cannot guarantee an entirely allergen-free environment. It is the
            customer&rsquo;s responsibility to inform us of any severe allergies
            prior to ordering. We exclude liability for adverse reactions to food
            consumed, to the maximum extent permitted by law.
          </p>
        </Section>

        <Section id="platform-conduct" title="4. Platform Use and Conduct">
          <p>You agree to use the Platform only for lawful purposes. You must not:</p>
          <BulletList
            items={[
              <>
                Use the Platform in any way that violates any applicable federal,
                state, or local laws or regulations.
              </>,
              <>
                Attempt to interfere with the proper working of the Platform,
                bypass our security measures, or introduce viruses, trojans, or
                other malicious code.
              </>,
              <>
                Submit false, inaccurate, or misleading information when placing
                orders or filling out wholesale/franchise forms.
              </>,
            ]}
          />
        </Section>

        <Section id="intellectual-property" title="5. Intellectual Property">
          <p>
            All content on the Platform, including but not limited to text,
            graphics, logos, images, menu descriptions, and software, is the
            property of TTH Enterprises Pty Ltd or its content suppliers and is
            protected by Australian and international copyright and trademark
            laws. You may not reproduce, distribute, or modify any content
            without our express written consent.
          </p>
        </Section>

        <Section id="third-party-links" title="6. Third-Party Links">
          <p>
            Our Platform may contain links to third-party websites or services
            (such as delivery partners, payment processors, or franchise
            application portals). We do not control and are not responsible for
            the content, privacy policies, or practices of any third-party
            websites. You access them at your own risk.
          </p>
        </Section>

        <Section id="limitation-of-liability" title="7. Limitation of Liability">
          <Subheading>Australian Consumer Law:</Subheading>
          <p>
            Nothing in these Terms excludes, restricts, or modifies any guarantee,
            right, or remedy implied or imposed by the ACL which cannot lawfully
            be excluded.
          </p>

          <Subheading>General Limitation:</Subheading>
          <p>
            To the maximum extent permitted by law, TTH Enterprises Pty Ltd and
            its affiliates, directors, and employees shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages,
            including loss of profits, data, or goodwill, arising out of or in
            connection with your use of the Platform or our products.
          </p>
        </Section>

        <Section id="governing-law" title="8. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the
            laws of Tasmania, Australia. Any disputes arising under or in
            connection with these Terms shall be subject to the exclusive
            jurisdiction of the courts of Tasmania.
          </p>
        </Section>

        <Section id="terms-changes" title="9. Changes to These Terms">
          <p>
            We reserve the right to update or modify these Terms at any time. We
            will notify you of any material changes by posting the updated Terms
            on this page and updating the &ldquo;Effective Date.&rdquo; Your
            continued use of the Platform after any changes indicates your
            acceptance of the new Terms.
          </p>
        </Section>

        <Section id="contact-us" title="10. Contact Us">
          <p>
            If you have any questions or concerns about these Terms, please
            contact us at:
          </p>
          <address className="not-italic space-y-1 text-stone-700">
            <p className="font-semibold text-stone-900">
              Saigon Express (TTH Enterprises Pty Ltd)
            </p>
            <p>ABN: 60 650 289 991</p>
            <p>
              Email:{" "}
              {contactEmail ? (
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-red-700 hover:text-red-800 underline underline-offset-2"
                >
                  {contactEmail}
                </a>
              ) : (
                <Link
                  href="/contact"
                  className="text-red-700 hover:text-red-800 underline underline-offset-2"
                >
                  contact us
                </Link>
              )}
            </p>
          </address>
        </Section>
      </article>
    </div>
  );
}
