"use client";

import Link from "@/components/link";
import { useSiteSetting } from "@/contexts/SiteContentContext";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
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
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-10">
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

        <Section title="1. Agreement to Terms">
          <p>
            By using the Platform to browse our menu, place an order, or submit
            an inquiry, you represent that you are legally capable of entering
            into binding contracts. If you are using the Platform on behalf of a
            business (e.g., through our Wholesale or Franchise portals), you
            represent that you have the authority to bind that business to these
            Terms.
          </p>
        </Section>

        <Section title="2. Orders, Pricing, and Payments">
          <Subheading>Menu and Pricing:</Subheading>
          <p>
            All prices are listed in Australian Dollars (AUD) and include Goods
            and Services Tax (GST) where applicable. We reserve the right to
            change prices, menu items, and availability at any time without
            prior notice.
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
            modifications to orders must be made immediately by contacting the
            specific Saigon Express location fulfilling your order. Refunds are
            issued at our sole discretion or as required by the Australian
            Consumer Law (ACL).
          </p>
        </Section>

        <Section title="3. Dietary Requirements and Allergens">
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

        <Section title="4. Platform Use and Conduct">
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

        <Section title="5. Intellectual Property">
          <p>
            All content on the Platform, including but not limited to text,
            graphics, logos, images, menu descriptions, and software, is the
            property of TTH Enterprises Pty Ltd or its content suppliers and is
            protected by Australian and international copyright and trademark
            laws. You may not reproduce, distribute, or modify any content
            without our express written consent.
          </p>
        </Section>

        <Section title="6. Third-Party Links">
          <p>
            Our Platform may contain links to third-party websites or services
            (such as delivery partners, payment processors, or franchise
            application portals). We do not control and are not responsible for
            the content, privacy policies, or practices of any third-party
            websites. You access them at your own risk.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
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

        <Section title="8. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the
            laws of Tasmania, Australia. Any disputes arising under or in
            connection with these Terms shall be subject to the exclusive
            jurisdiction of the courts of Tasmania.
          </p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>
            We reserve the right to update or modify these Terms at any time. We
            will notify you of any material changes by posting the updated Terms
            on this page and updating the &ldquo;Effective Date.&rdquo; Your
            continued use of the Platform after any changes indicates your
            acceptance of the new Terms.
          </p>
        </Section>

        <Section title="10. Contact Us">
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
