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

export default function PrivacyPolicy() {
  const contactEmail = useSiteSetting("contact_us_email")?.trim();

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-red-700 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Legal
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-stone-400 text-sm">Effective Date: June 20, 2026</p>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-10">
        <p className="text-stone-600 leading-relaxed">
          At Saigon Express (operated by TTH Enterprises Pty Ltd, ABN 60 650 289
          991), we are committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information
          when you visit our website (saigonexpress.com.au), use our Progressive
          Web App (PWA), place an order, or interact with our wholesale and
          franchise portals.
        </p>

        <Section title="1. Information We Collect">
          <p>
            We collect information that you provide directly to us, as well as
            data collected automatically when you interact with our platform.
          </p>

          <Subheading>Personal Information You Provide:</Subheading>
          <BulletList
            items={[
              <>
                <strong>Contact Details:</strong> Name, email address, phone
                number, and delivery address when you place an order, create an
                account, or subscribe to our newsletter.
              </>,
              <>
                <strong>Order Information:</strong> Details of the food and
                beverages you purchase, dietary preferences, and order history.
              </>,
              <>
                <strong>Payment Information:</strong> Payment card details are
                collected directly by our secure third-party payment processors
                (e.g., Stripe, Square). We do not store full credit card numbers
                on our servers.
              </>,
              <>
                <strong>Business Information:</strong> If you use our Wholesale
                or Franchise portals, we collect business names, ABNs, and
                relevant operational details.
              </>,
            ]}
          />

          <Subheading>Information Collected Automatically:</Subheading>
          <BulletList
            items={[
              <>
                <strong>Device and Usage Data:</strong> When you access our
                website or app, we may collect your IP address, browser type,
                operating system, and pages viewed.
              </>,
              <>
                <strong>Cookies:</strong> We use essential cookies and similar
                technologies to keep you logged in, remember your cart, and
                process orders. With your consent, we also use analytics cookies
                (such as Google Analytics) to understand site traffic.
              </>,
            ]}
          />
        </Section>

        <Section title="2. How We Use Your Information">
          <p>
            We use the information we collect for the following business
            purposes:
          </p>
          <BulletList
            items={[
              <>
                <strong>Order Fulfillment:</strong> To process your transactions,
                prepare your food, and manage pickup or delivery.
              </>,
              <>
                <strong>Customer Service:</strong> To send order confirmations,
                notify you of delays, and respond to your inquiries or feedback.
              </>,
              <>
                <strong>Marketing &amp; Promotions:</strong> To send you
                newsletters, special offers, and updates about new Saigon Express
                locations (only if you have opted in to receive these
                communications).
              </>,
              <>
                <strong>Business Operations:</strong> To process wholesale
                applications, manage franchise inquiries, and improve our website
                and menu offerings.
              </>,
              <>
                <strong>Security &amp; Fraud Prevention:</strong> To protect
                against unauthorized transactions and ensure the security of our
                platform.
              </>,
            ]}
          />
        </Section>

        <Section title="3. How We Share Your Information">
          <p>
            We do not sell or rent your personal information to third parties.
            We only share your data with trusted third parties in the following
            circumstances:
          </p>
          <BulletList
            items={[
              <>
                <strong>Service Providers:</strong> We share data with vendors
                who perform services on our behalf, such as payment processing,
                point-of-sale (POS) management, website hosting, and email
                marketing platforms.
              </>,
              <>
                <strong>Delivery Partners:</strong> If you request delivery, we
                share your name, address, and phone number with our delivery
                drivers or third-party delivery partners.
              </>,
              <>
                <strong>Legal Obligations:</strong> We may disclose your
                information if required to do so by law, or in response to a
                valid request by public authorities (e.g., a court or government
                agency).
              </>,
            ]}
          />
        </Section>

        <Section title="4. Data Storage and Security">
          <p>
            We implement reasonable administrative, technical, and physical
            security measures to protect your personal information. However,
            please be aware that no method of transmission over the internet or
            electronic storage is 100% secure.
          </p>
        </Section>

        <Section title="5. Your Rights and Choices">
          <p>
            Under the Australian Privacy Principles, you have rights regarding
            your personal data:
          </p>
          <BulletList
            items={[
              <>
                <strong>Access and Correction:</strong> You may request to see
                the personal information we hold about you and ask us to
                correct any inaccuracies.
              </>,
              <>
                <strong>Opt-Out of Marketing:</strong> You can unsubscribe from
                our marketing emails at any time by clicking the
                &ldquo;unsubscribe&rdquo; link at the bottom of the email, or by
                contacting us directly.
              </>,
              <>
                <strong>Cookie choices:</strong> When you first visit our site,
                you can accept analytics cookies or choose essential cookies only.
                Essential cookies support ordering, accounts, and cart
                functionality; choosing essential only does not prevent you from
                placing orders. You can change your choice at any time using{" "}
                <strong>Cookie settings</strong> in the site footer. You can also
                set your browser to refuse cookies, though blocking essential
                cookies may affect login, cart, or checkout functionality.
              </>,
            ]}
          />
        </Section>

        <Section title="6. Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or legal obligations. We will notify you of
            any significant changes by posting the new Privacy Policy on this
            page and updating the &ldquo;Effective Date&rdquo; at the top.
          </p>
        </Section>

        <Section title="7. Contact Us">
          <p>
            If you have any questions or concerns about this Privacy Policy or
            how we handle your data, please contact us at:
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
