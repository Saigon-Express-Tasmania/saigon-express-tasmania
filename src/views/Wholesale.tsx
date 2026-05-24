"use client";

import { useState } from "react";
import Link from "@/components/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, CheckCircle, TrendingDown, FileText, Truck, Users, Phone, ArrowLeft } from "lucide-react";

const LOGO_URL = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";

const NAV_LINKS = [
  { href: "/menu", label: "Our Food" },
  { href: "/wholesale-shop", label: "Wholesale Shop" },
  { href: "/catering", label: "Catering" },
  { href: "/franchise", label: "Franchise" },
  { href: "/stores", label: "Find Us" },
  { href: "/careers", label: "Careers" },
];

const PRICING_TIERS = [
  { minQty: "200+ units", discountPct: 25, badge: "Best Value", highlight: true },
  { minQty: "100+ units", discountPct: 20, badge: "Popular", highlight: false },
  { minQty: "50+ units",  discountPct: 15, badge: "", highlight: false },
  { minQty: "20+ units",  discountPct: 10, badge: "", highlight: false },
  { minQty: "10+ units",  discountPct: 5,  badge: "", highlight: false },
];

const BENEFITS = [
  { icon: TrendingDown, title: "Dynamic Bulk Pricing", desc: "Tiered discounts up to 25% for high-volume orders. The more you order, the more you save." },
  { icon: FileText,    title: "Automated Invoicing",  desc: "Professional PDF invoices generated instantly for every order, ready for your accounts team." },
  { icon: Truck,       title: "Weekly Delivery",      desc: "Scheduled weekly deliveries across Tasmania. Never run out of your best-selling items." },
  { icon: Users,       title: "Account Manager",      desc: "A dedicated Saigon Express contact for all your ordering, billing, and product queries." },
];

const WHO_WE_SUPPLY = [
  { emoji: "☕", label: "Cafés & Coffee Shops" },
  { emoji: "🏪", label: "Grocery & Deli Stores" },
  { emoji: "🏨", label: "Hotels & Accommodation" },
  { emoji: "🏫", label: "Schools & Universities" },
  { emoji: "🏥", label: "Hospitals & Aged Care" },
  { emoji: "🎪", label: "Events & Festivals" },
];

export default function Wholesale() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    businessName: "", contactName: "", email: "", phone: "",
    businessType: "", estimatedWeeklyVolume: "", message: "",
  });

  const submitInquiry = trpc.public.submitPartnerInquiry.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error("Failed to submit. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.contactName || !form.email) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submitInquiry.mutate({
      businessName: form.businessName,
      contactName: form.contactName,
      email: form.email,
      phone: form.phone || undefined,
      businessType: form.businessType || undefined,
      estimatedWeeklyVolume: form.estimatedWeeklyVolume || undefined,
      message: form.message || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">

      {/* Top bar */}
      <div className="bg-brand-dark text-white text-xs py-2 px-4 text-center tracking-wide">
        Wholesale Food Supply Tasmania — <a href="mailto:info@saigonexpress.com.au" className="underline hover:text-brand-amber transition-colors">info@saigonexpress.com.au</a>
        &nbsp;·&nbsp; <a href="tel:0416036016" className="hover:text-brand-amber transition-colors">0416 036 016</a>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <img loading="eager" src={LOGO_URL} alt="Saigon Express Tasmania" className="h-10 w-auto object-contain cursor-pointer" />
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-brand-dark/60 hover:text-brand-dark transition-colors">{l.label}</Link>
            ))}
          </nav>
          <a href="#partner-form" className="hidden md:inline-flex bg-brand-red text-white text-sm font-semibold px-4 py-2 hover:bg-brand-red/90 transition-colors">
            Become a Partner
          </a>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-brand-dark mb-1.5" />
            <div className="w-5 h-0.5 bg-brand-dark mb-1.5" />
            <div className="w-5 h-0.5 bg-brand-dark" />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-brand-dark" onClick={() => setMenuOpen(false)}>{l.label}</Link>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative h-[480px] overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-20 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">WHOLESALE FOOD SUPPLY TASMANIA</p>
          <h1 className="font-serif text-white text-5xl md:text-7xl leading-tight max-w-2xl mb-6">
            Supply Fresh<br />Vietnamese Food
          </h1>
          <p className="text-white/65 text-lg max-w-xl leading-relaxed mb-8">
            Partner with Saigon Express to stock authentic Vietnamese products. Competitive wholesale pricing, reliable weekly delivery, and automated invoicing.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#partner-form" className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2">
              Become a Partner <ChevronRight size={15} />
            </a>
            <Link href="/wholesale-shop">
              <span className="border border-white text-white px-6 py-3 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-colors cursor-pointer">
                Browse Products
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Who we supply */}
      <section className="bg-white py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="text-center text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-8">WHO WE SUPPLY</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {WHO_WE_SUPPLY.map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 bg-brand-cream text-center">
                <span className="text-3xl">{w.emoji}</span>
                <span className="text-xs font-semibold text-brand-dark/70 leading-tight">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">PARTNER BENEFITS</p>
            <h2 className="font-serif text-brand-dark text-4xl">Why Partner With Us?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-white p-6 hover:shadow-md transition-shadow duration-300">
                <div className="w-10 h-10 bg-brand-red flex items-center justify-center mb-4">
                  <b.icon size={18} className="text-white" />
                </div>
                <h3 className="font-serif text-brand-dark text-lg mb-2">{b.title}</h3>
                <p className="text-brand-dark/55 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="bg-brand-dark py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">VOLUME DISCOUNTS</p>
            <h2 className="font-serif text-white text-4xl">Bulk Pricing Tiers</h2>
            <p className="text-white/50 mt-3 text-sm">Discounts applied automatically at checkout based on order quantity</p>
          </div>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRICING_TIERS.map((tier, i) => (
              <div key={i} className={`p-5 text-center relative ${tier.highlight ? "bg-brand-red" : "bg-white/5 border border-white/10"}`}>
                {tier.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-amber text-brand-dark text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest whitespace-nowrap">
                    {tier.badge}
                  </span>
                )}
                <div className="font-serif text-white text-3xl font-bold mb-1">{tier.discountPct}%</div>
                <div className="text-white/50 text-xs uppercase tracking-wider mb-2">off</div>
                <div className="text-white text-sm font-semibold">{tier.minQty}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-6">Prices exclude GST. Minimum order 10 units. Delivery charges may apply outside Greater Hobart.</p>
        </div>
      </section>

      {/* Asymmetric split */}
      <section className="bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2">
          <div className="relative h-72 lg:h-auto overflow-hidden">
            <div className="absolute inset-0 bg-black" />
          </div>
          <div className="p-10 lg:p-16 flex flex-col justify-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">HOW IT WORKS</p>
            <h2 className="font-serif text-brand-dark text-4xl mb-6">Simple. Reliable.<br />Profitable.</h2>
            <div className="space-y-4">
              {[
                { step: "01", title: "Submit Your Enquiry", desc: "Fill in the partner form below. We'll review your business and get back within 2 business days." },
                { step: "02", title: "Receive Your Quote", desc: "We'll send a tailored wholesale price list based on your product mix and estimated weekly volume." },
                { step: "03", title: "Place Your First Order", desc: "Access our Quick-Order portal, choose your products, and schedule your first delivery." },
                { step: "04", title: "Weekly Auto-Invoicing", desc: "Every order generates a professional PDF invoice automatically, sent to your accounts email." },
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-brand-red font-bold text-sm font-mono flex-shrink-0 w-6">{s.step}</div>
                  <div>
                    <div className="font-semibold text-brand-dark text-sm mb-0.5">{s.title}</div>
                    <div className="text-brand-dark/55 text-sm leading-relaxed">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partner form */}
      <section id="partner-form" className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">BECOME A PARTNER</p>
              <h2 className="font-serif text-brand-dark text-4xl mb-4">Start Your Wholesale Partnership</h2>
              <p className="text-brand-dark/55 leading-relaxed mb-6 text-sm">
                Join over 50 Tasmanian businesses already stocking Saigon Express products. Fill in the form and our wholesale team will be in touch within 2 business days.
              </p>
              <div className="space-y-3 text-sm text-brand-dark/60">
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> No lock-in contracts</div>
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> Flexible minimum orders</div>
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> Dedicated account manager</div>
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> Automated PDF invoicing</div>
              </div>
              <div className="mt-8 p-5 bg-white border-l-4 border-brand-red">
                <p className="font-semibold text-brand-dark text-sm mb-2">Wholesale enquiries:</p>
                <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                  <Phone size={13} className="text-brand-red" />
                  <a href="tel:0416036016" className="hover:text-brand-red transition-colors">0416 036 016</a>
                </div>
                <a href="mailto:info@saigonexpress.com.au" className="text-brand-red font-bold hover:underline text-sm">info@saigonexpress.com.au</a>
              </div>
            </div>

            <div className="bg-white p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="text-brand-red mx-auto mb-4" />
                  <h3 className="font-serif text-2xl text-brand-dark mb-2">Application Received!</h3>
                  <p className="text-brand-dark/55 text-sm">Our wholesale team will contact you within 2 business days to discuss pricing and delivery options.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Business Name *</label>
                      <input type="text" required value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Contact Name *</label>
                      <input type="text" required value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Email *</label>
                      <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Business Type</label>
                      <select value={form.businessType} onChange={e => setForm(p => ({ ...p, businessType: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white">
                        <option value="">Select type…</option>
                        <option>Café / Coffee Shop</option>
                        <option>Grocery / Deli Store</option>
                        <option>Hotel / Accommodation</option>
                        <option>School / University</option>
                        <option>Hospital / Aged Care</option>
                        <option>Events / Catering</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Est. Weekly Volume</label>
                      <select value={form.estimatedWeeklyVolume} onChange={e => setForm(p => ({ ...p, estimatedWeeklyVolume: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white">
                        <option value="">Select range…</option>
                        <option>10–20 units</option>
                        <option>20–50 units</option>
                        <option>50–100 units</option>
                        <option>100–200 units</option>
                        <option>200+ units</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Additional Notes</label>
                    <textarea rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Products you're interested in, delivery requirements, any questions…"
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors resize-none" />
                  </div>
                  <button type="submit" disabled={submitInquiry.isPending}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50">
                    {submitInquiry.isPending ? "Submitting…" : "Submit Partnership Application"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 pb-8 border-b border-white/10">
            <img loading="lazy" src={LOGO_URL} alt="Saigon Express Tasmania" className="h-12 w-auto object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />
            <div className="flex flex-wrap gap-6 text-sm text-white/50">
              {NAV_LINKS.map(l => (
                <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <p>© {new Date().getFullYear()} TTH Enterprises Pty Ltd t/a Saigon Express Tasmania. ABN 60 650 289 991</p>
            <p>Level 2, 86 Collins St, Hobart TAS 7000 · <a href="mailto:info@saigonexpress.com.au" className="hover:text-white/60 transition-colors">info@saigonexpress.com.au</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
