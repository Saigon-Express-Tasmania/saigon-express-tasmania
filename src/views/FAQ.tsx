"use client";

import { useState } from "react";
import Link from "@/components/link";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Send,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const faqCategories = [
  {
    category: "Ordering & Delivery",
    icon: "🛵",
    questions: [
      {
        q: "How can I place an order?",
        a: "You can order online through our website, via Uber Eats, Menulog, or DoorDash, or visit any of our 8 Tasmania locations in person. Our online ordering system shows real-time availability for all menu items.",
      },
      {
        q: "Do you offer delivery?",
        a: "Yes! We partner with Uber Eats, Menulog, and DoorDash for delivery across Hobart and surrounding areas. Delivery availability depends on your location and the nearest Saigon Express branch.",
      },
      {
        q: "Can I pre-order for a specific time?",
        a: "Yes, scheduled ordering is available through our third-party delivery partners. For large group orders or catering, we recommend contacting us directly at catering@saigonexpress.com.au at least 48 hours in advance.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and cash at all store locations.",
      },
      {
        q: "Can I modify or cancel my order?",
        a: "Orders can be modified or cancelled within 5 minutes of placement. For in-store orders, please speak with our staff directly. For online orders, contact the relevant delivery platform.",
      },
    ],
  },
  {
    category: "Menu & Dietary",
    icon: "🍜",
    questions: [
      {
        q: "Do you have vegetarian and vegan options?",
        a: "Absolutely. Many of our dishes can be made vegetarian or vegan on request — including tofu stir-fries, vegetable pho, and vegan rice paper rolls. Our staff can advise on modifications for most dishes.",
      },
      {
        q: "Are your dishes gluten-free?",
        a: "Many of our dishes can be made gluten-free on request. Almost anything on our menu can be adapted — just let our staff know your dietary requirements when ordering. Cross-contamination may occur in our kitchens, so please inform us of any severe allergies.",
      },
      {
        q: "Is the Sandy Bay location Halal certified?",
        a: "Yes, Saigon Express Sandy Bay is our dedicated Halal-certified location. All meat served at this branch is sourced from certified Halal suppliers.",
      },
      {
        q: "How many dishes do you offer?",
        a: "Our full menu features dishes across 13 categories including Entrées, Bánh Mì, Bún Bowls, Phở, Rice Paper Rolls, Vietnamese Rice, Bao, Spicy Noodle Soup (Bún Bò Huế), Fried Rice, Noodle Soups, Hot Plates, Omelettes, Stir-Fried Dishes, Fried Chicken & Burgers, and Homemade Drinks.",
      },
      {
        q: "Do you have kids' meals?",
        a: "While we don't have a dedicated kids' menu, many of our dishes — such as plain steamed rice, mild pho, and fresh spring rolls — are popular with children. Our staff are happy to suggest suitable options.",
      },
      {
        q: "Can I see allergen information?",
        a: "Yes. Allergen information is available at all store locations and on request. Common allergens including gluten, shellfish, nuts, eggs, and dairy are present in various dishes. Please speak with our staff before ordering if you have any food allergies.",
      },
    ],
  },
  {
    category: "Catering",
    icon: "🎉",
    questions: [
      {
        q: "Do you cater for events?",
        a: "Yes! We offer professional catering for birthdays, corporate events, weddings, and private functions of all sizes. Our catering packages range from our Office Starter Pack (feeds 10–15) up to fully customised large-event solutions.",
      },
      {
        q: "How far in advance should I book catering?",
        a: "We recommend booking at least 48–72 hours in advance for smaller events, and at least 1–2 weeks for large events or weddings. For peak periods (Christmas, Easter, public holidays), earlier booking is strongly advised.",
      },
      {
        q: "What areas do you cater to?",
        a: "We cater across Greater Hobart and the surrounding Tasmanian regions. For events outside the Hobart metro area, please contact us at catering@saigonexpress.com.au to discuss logistics and any travel surcharges.",
      },
      {
        q: "Can I customise my catering menu?",
        a: "Yes. All catering packages can be customised to suit your dietary requirements, event theme, and budget. We offer vegetarian, vegan, gluten-free, and Halal options across our catering range.",
      },
      {
        q: "Do you provide serving equipment and staff?",
        a: "Our premium catering packages include serving equipment and, for larger events, on-site staff. Please discuss your requirements with our catering team when enquiring.",
      },
    ],
  },
  {
    category: "Wholesale & B2B",
    icon: "📦",
    questions: [
      {
        q: "How do I become a wholesale partner?",
        a: "Visit our Wholesale page and complete the 'Become a Partner' enquiry form, or email info@saigonexpress.com.au with your business details. Our wholesale team will contact you within 2 business days.",
      },
      {
        q: "What products are available for wholesale?",
        a: "We supply a full range of Vietnamese food products including frozen marinated meats, dough products, sauces, dried goods, fresh produce, and packaging materials. Our wholesale catalogue is available to approved partners through the Wholesale Portal.",
      },
      {
        q: "What are the minimum order quantities?",
        a: "Minimum order quantities vary by product category. Volume discount tiers apply from 10+ units, with our best rates available from 50+ units. Full pricing is displayed in the Wholesale Portal after partner approval.",
      },
      {
        q: "Do you offer bulk pricing discounts?",
        a: "Yes. We offer tiered bulk-buy discounts: 5% off for 10–24 units, 10% off for 25–49 units, 15% off for 50–99 units, 20% off for 100–199 units, and 25% off for 200+ units.",
      },
      {
        q: "How are wholesale invoices handled?",
        a: "Automated PDF invoices are generated for every wholesale transaction and are available for download immediately after order confirmation. All invoices include itemised product details, bulk discount breakdowns, GST calculations, and your business information.",
      },
      {
        q: "How do I place a wholesale order?",
        a: "Once your wholesale account is approved, log in to the Wholesale Portal at saigonexpress.com.au/wholesale-shop. Browse the full product catalogue, add items to your cart, and proceed to checkout. You can pay securely by credit/debit card or Apple Pay. Orders placed before 12pm AEST on business days are typically dispatched the same day; orders after 12pm are dispatched the following business day. You will receive an automated order confirmation and a PDF invoice by email immediately after checkout.",
      },
      {
        q: "What are the requirements to place a wholesale order?",
        a: "To order wholesale you must: (1) hold an active ABN or ACN registered in Australia; (2) be an approved Saigon Express wholesale partner — apply via the 'Become a Partner' form on our Wholesale page; (3) have a verified wholesale account login. There is no minimum spend per order, however bulk-discount pricing tiers apply from 10 units. Wholesale pricing is exclusive to approved business customers and is not available to the general public.",
      },
    ],
  },
  {
    category: "Franchise",
    icon: "🏪",
    questions: [
      {
        q: "How much does a Saigon Express franchise cost?",
        a: "The franchise licence fee is $30,000 + GST. Ongoing fees include a 5% royalty on gross sales and a 2% marketing levy. Total investment varies depending on the store format (Kiosk, Takeaway, or Restaurant) and location fit-out requirements.",
      },
      {
        q: "What franchise models are available?",
        a: "We offer three formats: Kiosk (ideal for food courts and high-traffic retail), Takeaway (our most popular format), and full Restaurant (dine-in with full kitchen). The Kiosk/Takeaway model is our preferred starting format for new franchisees.",
      },
      {
        q: "What is the contract term?",
        a: "The initial franchise agreement is for 5 years, with an optional renewal term of a further 5 years, subject to performance and compliance with the franchise agreement.",
      },
      {
        q: "Do you provide training and support?",
        a: "Yes. All franchisees receive comprehensive initial training covering operations, food preparation, customer service, and business management. Ongoing support includes access to our central kitchen supply chain, marketing materials, and the Franchise Hub resource library.",
      },
      {
        q: "Is a central kitchen available?",
        a: "Yes. Saigon Express operates a central kitchen that supplies franchisees with pre-prepared ingredients and signature sauces, ensuring consistency across all locations and reducing franchisee preparation time.",
      },
      {
        q: "How do I apply for a franchise?",
        a: "Complete the franchise application form on our Franchise page or contact us at info@saigonexpress.com.au. Our franchise team will review your application and arrange an initial consultation call within 5 business days.",
      },
    ],
  },
  {
    category: "Store Locations & Hours",
    icon: "📍",
    questions: [
      {
        q: "How many Saigon Express locations are there in Tasmania?",
        a: "We currently operate 8 locations across Tasmania: two in North Hobart (335 Elizabeth St and 329 Elizabeth St), one in Hobart CBD (95 Liverpool St), Sandy Bay (Halal), Kingston, Glebe Hill Village (Howrah), and two in Sorell (Gordon St and Gateway Shopping Centre).",
      },
      {
        q: "Are you open on public holidays?",
        a: "Yes, all Saigon Express locations are usually open on public holidays. Hours may vary slightly — we recommend checking with your nearest store directly or following our social media for any holiday hour updates.",
      },
      {
        q: "Do you have BYO?",
        a: "BYO (Bring Your Own alcohol) is available at our 329 Elizabeth Street, North Hobart location only. All other locations are fully licensed.",
      },
      {
        q: "Is table booking available?",
        a: "Table bookings are available at select locations. Please contact your preferred store directly or use the booking function on our website to check availability.",
      },
    ],
  },
  {
    category: "General",
    icon: "💬",
    questions: [
      {
        q: "How do I contact Saigon Express?",
        a: "You can reach us by phone on 0416 036 016, by email at info@saigonexpress.com.au, or by visiting any of our 8 Tasmania locations. For catering enquiries, use catering@saigonexpress.com.au.",
      },
      {
        q: "Do you have a loyalty or rewards program?",
        a: "We are currently developing a loyalty rewards program for our regular customers. Sign up to our newsletter to be the first to hear when it launches, and receive an exclusive welcome discount.",
      },
      {
        q: "How can I provide feedback?",
        a: "We welcome all feedback! You can email us at info@saigonexpress.com.au, leave a review on Google or TripAdvisor, or speak with the manager at any of our locations. Your feedback helps us improve.",
      },
      {
        q: "Do you have a mobile app?",
        a: "Yes! The Saigon Express app is available on the App Store and Google Play. Visit our 'Get the App' page for step-by-step installation instructions, including how to add it to your home screen for quick access.",
      },
      {
        q: "Are gift cards available?",
        a: "Gift cards are coming soon. Sign up to our newsletter to be notified when they become available.",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200 last:border-0">
      <button
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-stone-800 group-hover:text-red-700 transition-colors leading-snug">
          {q}
        </span>
        <span className="mt-0.5 shrink-0 text-stone-400 group-hover:text-red-600 transition-colors">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <div className="pb-5 pr-8 text-stone-600 leading-relaxed text-sm">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? faqCategories.filter((c) => c.category === activeCategory)
    : faqCategories;

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans">
      {/* Hero */}
      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-red-700 text-white text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Help Centre
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed">
            Everything you need to know about Saigon Express Tasmania — from
            ordering and menus to wholesale, catering, and franchising.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-stone-100 sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === null
                ? "bg-red-700 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Topics
          </button>
          {faqCategories.map((c) => (
            <button
              key={c.category}
              onClick={() =>
                setActiveCategory(
                  activeCategory === c.category ? null : c.category,
                )
              }
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === c.category
                  ? "bg-red-700 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {c.icon} {c.category}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        {filtered.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="font-serif text-2xl font-bold text-stone-900">
                {cat.category}
              </h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-6">
              {cat.questions.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit a Question form */}
      <SubmitQuestionForm />

      {/* Still need help CTA */}
      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">
            Still Have a Question?
          </h2>
          <p className="text-stone-400 mb-8 leading-relaxed">
            Our team is here to help. Reach out via phone, email, or use the
            live chat button on any page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:0416036016"
              className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              <Phone size={16} />
              0416 036 016
            </a>
            <a
              href="mailto:info@saigonexpress.com.au"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              <Mail size={16} />
              info@saigonexpress.com.au
            </a>
            <Link href="/stores">
              <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-full transition-colors">
                <MapPin size={16} />
                Find a Store
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitQuestionForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const submitMutation = trpc.public.submitFaqQuestion.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setQuestion("");
      setFormError("");
    },
    onError: (err: { message?: string }) => {
      setFormError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10) {
      setFormError("Please enter a question of at least 10 characters.");
      return;
    }
    setFormError("");
    submitMutation.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      question: question.trim(),
    });
  };

  return (
    <div className="bg-stone-50 py-16 px-4 border-t border-stone-200">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <MessageCircle className="text-red-700" size={22} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mb-3">
            Ask Us Anything
          </h2>
          <p className="text-stone-500 leading-relaxed">
            Can't find the answer you're looking for? Submit your question and
            our team will get back to you.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-600 mb-3" size={40} />
            <h3 className="font-semibold text-xl text-stone-900 mb-2">
              Question Received!
            </h3>
            <p className="text-stone-500 mb-6">
              Thank you! We'll review your question and get back to you as soon
              as possible.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-red-700 font-semibold hover:underline text-sm"
            >
              Ask another question
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Your Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={128}
                  placeholder="e.g. Nguyen Van A"
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Email{" "}
                  <span className="text-stone-400 font-normal">
                    (optional — for reply)
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  placeholder="your@email.com"
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                Your Question <span className="text-red-600">*</span>
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                placeholder="e.g. Do you offer catering for large events? What are the minimum numbers?"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
              />
              <p className="text-xs text-stone-400 mt-1 text-right">
                {question.length}/1000
              </p>
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={
                submitMutation.isPending || !name.trim() || !question.trim()
              }
              className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {submitMutation.isPending ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send size={15} />
              )}
              {submitMutation.isPending ? "Sending..." : "Submit Question"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
