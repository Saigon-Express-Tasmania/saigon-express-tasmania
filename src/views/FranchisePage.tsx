"use client";

import AppImage from "@/components/AppImage";
import { useState } from "react";
import Link from "@/components/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, Phone, MapPin, TrendingUp, Users, Award, Utensils, BookOpen, HeartHandshake, Calendar, MessageCircle, X } from "lucide-react";

const LOGO_URL = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";

const NAV_LINKS = [
  { href: "/menu", label: "Our Food" },
  { href: "/wholesale-shop", label: "Wholesale Shop" },
  { href: "/catering", label: "Catering" },
  { href: "/franchise", label: "Franchise" },
  { href: "/stores", label: "Find Us" },
  { href: "/careers", label: "Careers" },
];

const BENEFITS = [
  { icon: Award,          title: "Proven Brand",         desc: "Established Vietnamese food brand with loyal customers across Tasmania. Trademark pending for registration." },
  { icon: Utensils,       title: "Central Kitchen",       desc: "Centralised production kitchen ensures consistent quality and reduces your operational complexity." },
  { icon: BookOpen,       title: "Full Training",         desc: "Comprehensive onboarding covering food preparation, customer service, POS systems, and daily operations." },
  { icon: TrendingUp,     title: "Marketing Support",     desc: "Branded marketing kits, social media templates, and national campaign materials from day one." },
  { icon: Users,          title: "Franchise Community",   desc: "Join a growing network of Saigon Express franchise partners with regular meetings and knowledge sharing." },
  { icon: HeartHandshake, title: "Ongoing Support",       desc: "Dedicated franchise support team available for operational, marketing, and business development guidance." },
];

const MODELS = [
  { name: "Kiosk",     icon: "🏪", desc: "Compact format ideal for food courts and high-traffic locations. Low fit-out cost, fast setup.", investment: "$80K – $120K" },
  { name: "Takeaway",  icon: "🥡", desc: "High-volume takeaway format with streamlined menu. Perfect for suburban strips and busy lunchtime trade.", investment: "$120K – $180K" },
  { name: "Restaurant",icon: "🍽️", desc: "Full dine-in experience with the complete Saigon Express menu. Ideal for high-street and lifestyle precincts.", investment: "$180K – $280K" },
];

const STEPS = [
  { num: "01", title: "Submit Your Application",  desc: "Complete the expression of interest form below. Our franchise team reviews all applications within 5 business days." },
  { num: "02", title: "Discovery Call",            desc: "A 30-minute call with our Franchise Development Manager to discuss your goals, location, and investment capacity." },
  { num: "03", title: "Disclosure Document",       desc: "Receive the Franchise Disclosure Document and review with your legal and financial advisors." },
  { num: "04", title: "Site Assessment",           desc: "We help identify and assess your proposed location for foot traffic, demographics, and fit-out feasibility." },
  { num: "05", title: "Training & Onboarding",     desc: "Complete our 4-week training program at our central kitchen and an existing Saigon Express store." },
  { num: "06", title: "Grand Opening",             desc: "Launch your store with full marketing support, a dedicated opening team, and your first supply delivery." },
];

export default function FranchisePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", city: "",
    investmentBudget: "", hasExperience: "no", message: "",
  });

  // Consultation modal state
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [consultForm, setConsultForm] = useState({
    name: "", email: "", phone: "", preferredDate: "", preferredTime: "", message: "",
  });

  const submitApplication = trpc.public.submitFranchiseApplication.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const bookConsultation = trpc.franchise.bookConsultation.useMutation({
    onSuccess: () => setConsultSubmitted(true),
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) { toast.error("Name and email are required."); return; }
    submitApplication.mutate({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      city: form.city || undefined,
      state: "Tasmania",
      investmentBudget: form.investmentBudget || undefined,
      businessExperience: form.hasExperience === "yes" ? "Yes — prior business/franchise experience" : "No prior franchise experience",
      message: form.message || undefined,
    });
  };

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultForm.name || !consultForm.email || !consultForm.phone) {
      toast.error("Name, email and phone are required.");
      return;
    }
    bookConsultation.mutate({
      name: consultForm.name,
      email: consultForm.email,
      phone: consultForm.phone,
      preferredDate: consultForm.preferredDate || undefined,
      preferredTime: consultForm.preferredTime || undefined,
      message: consultForm.message || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">

      {/* Top bar */}
      <div className="bg-brand-dark text-white text-xs py-2 px-4 text-center tracking-wide">
        Franchise enquiries: <a href="mailto:info@saigonexpress.com.au" className="underline hover:text-brand-amber transition-colors">info@saigonexpress.com.au</a>
        &nbsp;·&nbsp; <a href="tel:0416036016" className="hover:text-brand-amber transition-colors">0416 036 016</a>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <AppImage src={LOGO_URL} alt="Saigon Express Tasmania" width={180} height={40} priority className="h-10 w-auto object-contain cursor-pointer" />
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-brand-dark/60 hover:text-brand-dark transition-colors">{l.label}</Link>
            ))}
          </nav>
          <a href="#franchise-form" className="hidden md:inline-flex bg-brand-red text-white text-sm font-semibold px-4 py-2 hover:bg-brand-red/90 transition-colors">
            Apply Now
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
      <section className="relative h-[520px] overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-10 h-full flex flex-col items-start justify-center px-6 md:px-20 max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">FRANCHISE OPPORTUNITY</p>
          <h1 className="font-serif text-white text-5xl md:text-7xl leading-tight max-w-3xl mb-6">
            Own a Saigon Express<br />in Tasmania
          </h1>
          <p className="text-white/65 text-lg max-w-xl leading-relaxed mb-8">
            Join Tasmania's fastest-growing Vietnamese food franchise. Proven systems, central kitchen support, and a brand Tasmanians love.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#franchise-form" className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2">
              Express Your Interest <ChevronRight size={15} />
            </a>
            <a href="#models" className="border border-white text-white px-6 py-3 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-colors">
              View Franchise Models
            </a>
          </div>
        </div>
      </section>

      {/* Investment summary strip */}
      <section className="bg-brand-red text-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "$30K",  label: "Franchise Licence Fee (+ GST)" },
            { num: "5%",    label: "Royalty Fee" },
            { num: "2%",    label: "Marketing Levy" },
            { num: "5 + 5", label: "Year Contract Term" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-serif text-4xl font-bold mb-1">{s.num}</div>
              <div className="text-white/65 text-xs font-medium uppercase tracking-wider leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About the opportunity */}
      <section className="bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2">
          <div className="relative h-72 lg:h-auto overflow-hidden min-h-[400px]">
            <AppImage
              src="/manus-storage/IMG_43782_5753892a.jpg"
              alt="Saigon Express opens new store in Hobart CBD — Pulse Tasmania"
              fill
              className="object-cover"
            />
          </div>
          <div className="p-10 lg:p-16 flex flex-col justify-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">ABOUT THE OPPORTUNITY</p>
            <h2 className="font-serif text-brand-dark text-4xl mb-5">A Business Built<br />on Real Food</h2>
            <p className="text-brand-dark/60 text-sm leading-relaxed mb-4">
              Saigon Express Tasmania is operated by TTH Enterprises Pty Ltd, led by Director Dr. Tien Ho. With 8 locations across Tasmania and a central kitchen in Hobart, we have built a franchise system designed for scalability and consistency.
            </p>
            <p className="text-brand-dark/60 text-sm leading-relaxed mb-6">
              Our menu spans over 100 authentic Vietnamese dishes — from bánh mì and phở to rice paper rolls, bún bowls, and homemade drinks — all prepared from our central kitchen to ensure quality across every location.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {["Trademark Pending Registration", "Central Kitchen Support", "8 Existing Tasmania Stores", "Full Training Provided"].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-brand-dark/70">
                  <CheckCircle size={13} className="text-brand-red flex-shrink-0" /> {f}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-brand-cream text-xs text-brand-dark/50 leading-relaxed">
              <strong className="text-brand-dark/70">Legal Entity:</strong> Saigon Express Franchise Management / TTH Enterprises Pty Ltd · ABN 60 650 289 991<br />
              <strong className="text-brand-dark/70">Registered Address:</strong> Level 2, 86 Collins St, Hobart TAS 7000
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">FRANCHISE BENEFITS</p>
            <h2 className="font-serif text-brand-dark text-4xl">Everything You Need<br />to Succeed</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* Franchise models */}
      <section id="models" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">FRANCHISE FORMATS</p>
            <h2 className="font-serif text-brand-dark text-4xl">Choose Your Model</h2>
            <p className="text-brand-dark/55 mt-3 text-sm max-w-xl mx-auto">Three proven formats to suit different locations, budgets, and ambitions. Preferred model: Kiosk / Takeaway / Restaurant.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {MODELS.map((m, i) => (
              <div key={i} className={`p-8 ${i === 0 ? "bg-brand-red text-white" : "bg-brand-cream"}`}>
                <div className="text-4xl mb-4">{m.icon}</div>
                <h3 className={`font-serif text-2xl mb-3 ${i === 0 ? "text-white" : "text-brand-dark"}`}>{m.name}</h3>
                <p className={`text-sm leading-relaxed mb-4 ${i === 0 ? "text-white/75" : "text-brand-dark/60"}`}>{m.desc}</p>
                <div className={`text-xs font-bold uppercase tracking-wider ${i === 0 ? "text-white/60" : "text-brand-dark/40"}`}>Total Investment</div>
                <div className={`font-serif text-xl font-bold mt-1 ${i === 0 ? "text-white" : "text-brand-dark"}`}>{m.investment}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-brand-dark/40 text-xs mt-6">Investment ranges are indicative and include fit-out, equipment, initial stock, and working capital. Excludes franchise licence fee. Subject to site assessment.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-brand-dark">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">THE PROCESS</p>
            <h2 className="font-serif text-white text-4xl">From Enquiry to Opening</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6">
                <div className="text-brand-amber font-bold text-sm font-mono mb-3">{s.num}</div>
                <h3 className="font-serif text-white text-lg mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE CONSULTATION SECTION ── */}
      <section
        className="relative py-20 px-6 overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 65% 50%, #b91c1c 0%, #7f1d1d 55%, #450a0a 100%)" }}
      >
        {/* subtle dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold tracking-widest uppercase px-5 py-2 rounded-full mb-6 border border-white/20">
            <Calendar size={13} />
            Free Consultation
          </div>
          <h2 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Book a Free Consultation
          </h2>
          <p className="text-white/75 text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Chat with our franchise team. We'll answer all your questions and help you decide if Saigon Express is the right opportunity for you.
          </p>
          <button
            onClick={() => setConsultModalOpen(true)}
            className="inline-flex items-center gap-3 bg-white text-brand-red font-bold text-base px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-200"
          >
            <MessageCircle size={20} />
            Book a Free Consultation
          </button>
        </div>
      </section>

      {/* Application form */}
      <section id="franchise-form" className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">EXPRESSION OF INTEREST</p>
              <h2 className="font-serif text-brand-dark text-4xl mb-4">Take the First Step</h2>
              <p className="text-brand-dark/55 leading-relaxed mb-6 text-sm">
                Complete the form and our Franchise Development Manager will be in touch within 5 business days to discuss your application in confidence.
              </p>
              <div className="space-y-3 text-sm text-brand-dark/60">
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> Confidential enquiry</div>
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> No obligation to proceed</div>
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> Response within 5 business days</div>
                <div className="flex items-center gap-3"><CheckCircle size={15} className="text-brand-red" /> Free discovery call included</div>
              </div>
              <div className="mt-8 p-5 bg-white border-l-4 border-brand-red">
                <p className="font-semibold text-brand-dark text-sm mb-2">Franchise enquiries:</p>
                <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                  <Phone size={13} className="text-brand-red" />
                  <a href="tel:0416036016" className="hover:text-brand-red transition-colors">0416 036 016</a>
                </div>
                <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                  <MapPin size={13} className="text-brand-red" />
                  <span>Level 2, 86 Collins St, Hobart TAS 7000</span>
                </div>
                <a href="mailto:info@saigonexpress.com.au" className="text-brand-red font-bold hover:underline text-sm">info@saigonexpress.com.au</a>
              </div>
            </div>

            <div className="bg-white p-8">
              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="text-brand-red mx-auto mb-4" />
                  <h3 className="font-serif text-2xl text-brand-dark mb-2">Application Received!</h3>
                  <p className="text-brand-dark/55 text-sm">Our Franchise Development Manager will be in touch within 5 business days.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Full Name *</label>
                      <input type="text" required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Email *</label>
                      <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Preferred Location</label>
                      <input type="text" placeholder="e.g. Launceston, Devonport…" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Investment Budget</label>
                      <select value={form.investmentBudget} onChange={e => setForm(p => ({ ...p, investmentBudget: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white">
                        <option value="">Select range…</option>
                        <option>$80K – $120K (Kiosk)</option>
                        <option>$120K – $180K (Takeaway)</option>
                        <option>$180K – $280K (Restaurant)</option>
                        <option>$280K+ (Multiple sites)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Prior Business Experience?</label>
                      <select value={form.hasExperience} onChange={e => setForm(p => ({ ...p, hasExperience: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-white">
                        <option value="no">No prior experience</option>
                        <option value="yes">Yes — business/franchise experience</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Tell Us About Yourself</label>
                    <textarea rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Your background, why you're interested in Saigon Express, any questions…"
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors resize-none" />
                  </div>
                  <button type="submit" disabled={submitApplication.isPending}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50">
                    {submitApplication.isPending ? "Submitting…" : "Submit Expression of Interest"}
                  </button>
                  <p className="text-xs text-brand-dark/35 text-center">Your enquiry is treated in strict confidence. We do not share your information with third parties.</p>
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
            <AppImage src={LOGO_URL} alt="Saigon Express Tasmania" width={200} height={48} className="h-12 w-auto object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />
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

      {/* ── CONSULTATION BOOKING MODAL ── */}
      {consultModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setConsultModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-serif text-xl font-bold text-brand-dark">Book a Free Consultation</h3>
                <p className="text-sm text-brand-dark/50 mt-0.5">We'll get back to you within 24 hours</p>
              </div>
              <button
                onClick={() => setConsultModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-brand-dark/50" />
              </button>
            </div>

            {/* Modal body */}
            {consultSubmitted ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h4 className="font-serif text-xl font-bold text-brand-dark mb-2">Booking Received!</h4>
                <p className="text-brand-dark/60 text-sm">
                  Thank you, {consultForm.name}. Our franchise team will contact you at {consultForm.email} within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setConsultModalOpen(false);
                    setConsultSubmitted(false);
                    setConsultForm({ name: "", email: "", phone: "", preferredDate: "", preferredTime: "", message: "" });
                  }}
                  className="mt-6 bg-brand-red text-white px-8 py-3 rounded-full font-semibold text-sm hover:bg-brand-red/90 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleConsultSubmit} className="px-6 py-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">Full Name *</label>
                    <input
                      required
                      value={consultForm.name}
                      onChange={e => setConsultForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">Phone *</label>
                    <input
                      required
                      value={consultForm.phone}
                      onChange={e => setConsultForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                      placeholder="0400 000 000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={consultForm.email}
                    onChange={e => setConsultForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={consultForm.preferredDate}
                      onChange={e => setConsultForm(f => ({ ...f, preferredDate: e.target.value }))}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">Preferred Time</label>
                    <select
                      value={consultForm.preferredTime}
                      onChange={e => setConsultForm(f => ({ ...f, preferredTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red bg-white"
                    >
                      <option value="">Any time</option>
                      <option value="Morning (9am–12pm)">Morning (9am–12pm)</option>
                      <option value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</option>
                      <option value="Evening (5pm–7pm)">Evening (5pm–7pm)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wide mb-1">Message (optional)</label>
                  <textarea
                    rows={3}
                    value={consultForm.message}
                    onChange={e => setConsultForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red resize-none"
                    placeholder="Tell us a bit about yourself and your interest in franchising…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={bookConsultation.isPending}
                  className="w-full bg-brand-red text-white py-3.5 rounded-full font-bold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bookConsultation.isPending ? "Submitting…" : (
                    <><MessageCircle size={16} /> Book My Free Consultation</>
                  )}
                </button>
                <p className="text-xs text-brand-dark/35 text-center">
                  Your enquiry is treated in strict confidence. We do not share your information with third parties.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
