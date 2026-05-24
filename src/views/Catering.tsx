"use client";

import { useState } from "react";
import Link from "@/components/link";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Users, Clock, Star, ChevronRight, MapPin, Phone } from "lucide-react";

const LOGO_URL = "/manus-storage/saigonexpresslogo_clean_719f26ac.png";

const NAV_LINKS = [
  { href: "/menu", label: "Our Food" },
  { href: "/wholesale-shop", label: "Wholesale Shop" },
  { href: "/catering", label: "Catering" },
  { href: "/franchise", label: "Franchise" },
  { href: "/stores", label: "Find Us" },
  { href: "/careers", label: "Careers" },
];

const PACKS = [
  {
    name: "Office Starter Pack",
    serves: "10–20 guests",
    price: "From $8.50/person",
    description: "A selection of our signature bánh mì, fresh spring rolls, and homemade drinks — perfect for team lunches and morning meetings.",
    includes: ["Choice of 3 bánh mì varieties", "Fresh rice paper rolls", "Homemade lemongrass drinks", "Napkins & serving trays"],
    tag: "MOST POPULAR",
    tagBg: "bg-brand-red",
    img: "/manus-storage/banh-mi-1_9ba4dcf0.jpg",
  },
  {
    name: "Event Feast Pack",
    serves: "30–60 guests",
    price: "From $12/person",
    description: "A full Vietnamese spread with bánh mì, phở, bún bowls, and entrée platters — ideal for corporate events, birthdays, and celebrations.",
    includes: ["Full bánh mì bar (5 varieties)", "Phở or bún bowl station", "Entrée platters", "Dessert rice paper rolls", "Full service setup"],
    tag: "BEST VALUE",
    tagBg: "bg-brand-amber",
    img: "/manus-storage/pho-1_92a9985e.jpg",
  },
  {
    name: "Corporate Catering",
    serves: "50–200 guests",
    price: "Custom quote",
    description: "Tailored menus for large corporate functions, conferences, and gala dinners. Includes dedicated staff, full setup, and branded presentation.",
    includes: ["Fully customised menu", "Dedicated catering staff", "Premium branded presentation", "Dietary accommodations", "Post-event cleanup"],
    tag: "PREMIUM",
    tagBg: "bg-brand-dark",
    img: "/manus-storage/bun-bowl-1_3b12ea6c.jpg",
  },
  {
    name: "Custom Pack",
    serves: "Any size",
    price: "Get a quote",
    description: "Have something specific in mind? We'll build a package around your event, dietary needs, and budget. No event is too big or too small.",
    includes: ["Fully flexible menu", "Any dietary requirement", "Any event size", "Delivery or pick-up", "Personal consultation"],
    tag: "FLEXIBLE",
    tagBg: "bg-brand-dark/70",
    img: "/manus-storage/spring-rolls-1_02f22814.jpg",
  },
];

const WHY_US = [
  { emoji: "🌿", title: "Fresh Daily", desc: "Every item prepared fresh on the day of your event — never frozen, never pre-packaged." },
  { emoji: "🏆", title: "Award-Winning Recipes", desc: "Authentic Vietnamese recipes refined over decades, brought to your event." },
  { emoji: "🚚", title: "Scheduled Delivery", desc: "We deliver catering orders across Hobart, Sorell, Kingston, and surrounding areas. Minimum 24 hours' notice required." },
  { emoji: "🌱", title: "Dietary Friendly", desc: "Halal, vegetarian, vegan, and gluten-free options available on request." },
  { emoji: "👨‍🍳", title: "Experienced Team", desc: "Our catering team has served thousands of events across Tasmania." },
  { emoji: "📋", title: "Hassle-Free Planning", desc: "One point of contact from enquiry to clean-up. We handle everything." },
];

export default function Catering() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    contactName: "", email: "", phone: "", businessName: "",
    eventDate: "", guestCount: "", message: "",
  });

  const handleEnquireBox = (boxName: string, price: string) => {
    setForm(prev => ({
      ...prev,
      message: prev.message ? prev.message : `I'm interested in ordering the ${boxName} (${price}). Please provide more details.`,
    }));
    const el = document.getElementById("catering-enquiry-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitInquiry = trpc.public.submitPartnerInquiry.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error("Failed to send enquiry. Please email catering@saigonexpress.com.au directly."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.email) { toast.error("Name and email are required"); return; }
    submitInquiry.mutate({
      contactName: form.contactName,
      businessName: form.businessName || form.contactName,
      email: form.email,
      phone: form.phone || undefined,
      message: `CATERING ENQUIRY\nEvent Date: ${form.eventDate}\nGuest Count: ${form.guestCount}\n\n${form.message}`,
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">

      {/* Top bar */}
      <div className="bg-brand-dark text-white text-xs py-2 px-4 text-center tracking-wide">
        Catering enquiries: <a href="mailto:catering@saigonexpress.com.au" className="underline hover:text-brand-amber transition-colors">catering@saigonexpress.com.au</a>
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
          <a href="#catering-form" className="hidden md:inline-flex bg-brand-red text-white text-sm font-semibold px-4 py-2 hover:bg-brand-red/90 transition-colors">
            Get a Quote
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
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">BÁNH MÌ CATERING HOBART</p>
          <h1 className="font-serif text-white text-5xl md:text-7xl leading-tight max-w-2xl mb-6">
            Catering for<br />Every Occasion
          </h1>
          <p className="text-white/65 text-lg max-w-xl leading-relaxed mb-8">
            Authentic Vietnamese catering delivered fresh across Tasmania — from office lunches to gala dinners.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#packs" className="bg-brand-red text-white px-6 py-3 font-semibold text-sm hover:bg-brand-red/90 transition-colors inline-flex items-center gap-2">
              View Catering Packs <ChevronRight size={15} />
            </a>
            <a href="#catering-menu" className="bg-white/10 border border-white/40 text-white px-6 py-3 font-semibold text-sm hover:bg-white/20 transition-colors inline-flex items-center gap-2">
              Full Menu & Prices <ChevronRight size={15} />
            </a>
            <a href="#catering-form" className="border border-white text-white px-6 py-3 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-colors">
              Request a Quote
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-brand-red text-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "500+", label: "Events Catered" },
            { num: "50,000+", label: "Guests Served" },
            { num: "8", label: "Tasmania Locations" },
            { num: "100%", label: "Fresh Daily" },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-serif text-4xl font-bold mb-1">{s.num}</div>
              <div className="text-white/65 text-sm font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-white py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">WHY SAIGON EXPRESS CATERING</p>
            <h2 className="font-serif text-brand-dark text-4xl">Tasmania's Favourite<br />Vietnamese Caterer</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_US.map((item, i) => (
              <div key={i} className="flex gap-4 p-5 bg-brand-cream">
                <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                <div>
                  <h3 className="font-serif text-brand-dark text-lg mb-1">{item.title}</h3>
                  <p className="text-brand-dark/55 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catering packs */}
      <section id="packs" className="py-16 bg-brand-cream">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">CATERING PACKAGES</p>
            <h2 className="font-serif text-brand-dark text-4xl">Choose Your Pack</h2>
            <p className="text-brand-dark/55 mt-3 max-w-xl mx-auto text-sm">All packs include fresh preparation on the day, eco-friendly packaging, and delivery to your venue.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PACKS.map((pack, i) => (
              <div key={i} className="bg-white overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-[16/7] overflow-hidden">
                  <img loading="lazy" src={pack.img} alt={pack.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-brand-dark/25" />
                  <span className={`absolute top-4 left-4 ${pack.tagBg} text-white text-[10px] font-bold px-3 py-1 tracking-widest uppercase`}>
                    {pack.tag}
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-serif text-brand-dark text-2xl">{pack.name}</h3>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-brand-red text-sm">{pack.price}</div>
                      <div className="text-xs text-brand-dark/40 flex items-center gap-1 justify-end mt-0.5">
                        <Users size={11} /> {pack.serves}
                      </div>
                    </div>
                  </div>
                  <p className="text-brand-dark/60 text-sm leading-relaxed mb-4">{pack.description}</p>
                  <ul className="space-y-1.5 mb-5">
                    {pack.includes.map((inc, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-brand-dark/70">
                        <CheckCircle size={13} className="text-brand-red flex-shrink-0" /> {inc}
                      </li>
                    ))}
                  </ul>
                  <a href="#catering-form" className="inline-flex items-center gap-2 bg-brand-dark text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-red transition-colors">
                    Enquire Now <ChevronRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catering Menu */}
      <section id="catering-menu" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">FULL CATERING MENU</p>
            <h2 className="font-serif text-brand-dark text-4xl">Order by the Box</h2>
            <p className="text-brand-dark/55 mt-3 max-w-2xl mx-auto text-sm">All boxes are freshly prepared on the day of your event. Please provide at least 24 hours' notice. Contact <a href="mailto:catering@saigonexpress.com.au" className="text-brand-red underline">catering@saigonexpress.com.au</a> to customise your order.</p>
          </div>

          {/* Menu Page 1 — Boxes */}
          <div className="mb-4">
            <h3 className="font-serif text-brand-dark text-2xl mb-6 pb-2 border-b border-brand-cream">Catering Boxes</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              {
                name: "Saigon Feast Box",
                price: "$160",
                serves: "8–10 People",
                includes: ["8 x Mini Bowls", "8 x Fresh Rice Paper Rolls cut in half", "6 x Mini Banh Mi", "4 x Bao Buns"],
                img: "/manus-storage/SaigonFeastBox_6c26a5d8.jpg",
              },
              {
                name: "Rice Paper Roll Box",
                price: "$130",
                serves: "8–10 People",
                includes: ["28 x Standard Saigon RPR served with a variety of delicious sauces"],
                img: "/manus-storage/Ricepaperrollplatter_b21700d4.jpg",
              },
              {
                name: "Spring Roll Box",
                price: "$115",
                serves: "6–8 People",
                includes: ["20 x Vegan Spring Roll", "30 x Seafood Spring Roll"],
                img: "/manus-storage/Springrollplatter_c7f62c18.jpg",
              },
              {
                name: "Mixed Entrée Box",
                price: "$115",
                serves: "6–8 People",
                includes: ["10 x Vegan Spring Roll", "10 x Seafood Spring Roll", "10 x Prawn Toast", "10 x Fried Pork and Chive Dumpling"],
                img: "/manus-storage/MixedEntreePlatter_983d3d92.jpg",
              },
              {
                name: "Saigon Lunch Box",
                price: "$140",
                serves: "6–8 People",
                includes: ["10 x Mixed Mini Bowls", "10 x Mixed Mini Banh Mi"],
                img: "/manus-storage/BowlsBox_575d600e.jpg",
              },
              {
                name: "Steamed Bao Bun Box",
                price: "$130",
                serves: "6–8 People",
                includes: ["20 x Mixed Bao Buns", "Available in a variety of flavours"],
                img: "/manus-storage/SteamedBaoBunPlatter_3c06d7a4.jpg",
              },
              {
                name: "Saigon Bánh Mì Box",
                price: "$150",
                serves: "6–8 People",
                includes: ["30 x Mini Bánh Mì Baguettes", "Available in a variety of flavours"],
                img: "/manus-storage/SaigonBanhMiBox_94e826fc.jpg",
              },
              {
                name: "Saigon Street Box",
                price: "$140",
                serves: "6–8 People",
                includes: ["15 x Mixed Mini Bánh Mì", "20 x Mixed Saigon Rolls"],
                img: "/manus-storage/BanhMi&FreshrollsBox_ca58276a.jpg",
              },
              {
                name: "Mini Bowls Box",
                price: "$130",
                serves: "8–10 People",
                includes: ["20 x Mini Bowls", "A mix of Gỏi (Viet Salad), Bún (Noodle Salad) and Cơm (Rice)"],
                img: "/manus-storage/MiniBanhMiBox_5a74c97a.jpg",
              },
            ].map((item, i) => (
              <div key={i} className="bg-brand-cream overflow-hidden hover:shadow-md transition-shadow duration-300 group flex flex-col h-full">
                <div className="relative aspect-square overflow-hidden">
                  <img loading="lazy" src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-brand-red text-white text-sm font-bold px-3 py-1">
                    {item.price}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h4 className="font-serif text-brand-dark text-xl mb-1">{item.name}</h4>
                  <p className="text-xs text-brand-red font-semibold mb-3 flex items-center gap-1"><Users size={11} /> Caters {item.serves}</p>
                  <ul className="space-y-1 mb-4 flex-1">
                    {item.includes.map((inc, j) => (
                      <li key={j} className="text-xs text-brand-dark/65 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-brand-red mt-1.5 flex-shrink-0" />{inc}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleEnquireBox(item.name, item.price)}
                    className="w-full bg-brand-red text-white text-xs font-bold py-2.5 px-4 hover:bg-brand-red/90 transition-colors flex items-center justify-center gap-1.5 mt-auto"
                  >
                    Enquire Now <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Menu Page 2 — Hot Dishes */}
          <div className="mb-4">
            <h3 className="font-serif text-brand-dark text-2xl mb-6 pb-2 border-b border-brand-cream">Hot Dishes & Platters</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                name: "Saigon Fried Rice",
                prices: [{ size: "Small", price: "$65", serves: "5–7 People" }, { size: "Medium", price: "$95", serves: "8–12 People" }, { size: "Large", price: "$125", serves: "15–20 People" }],
                img: "/manus-storage/SaigonFriedRice_48676d3d.jpg",
              },
              {
                name: "Vietnamese Salad",
                prices: [{ size: "Small", price: "$35", serves: "5–7 People" }, { size: "Medium", price: "$55", serves: "8–12 People" }, { size: "Large", price: "$75", serves: "15–20 People" }],
                img: "/manus-storage/VietnameseSalad_cb8a745b.jpg",
              },
              {
                name: "Steamed Jasmine Rice",
                prices: [{ size: "Small", price: "$28", serves: "5–7 People" }, { size: "Medium", price: "$42", serves: "8–12 People" }, { size: "Large", price: "$55", serves: "15–20 People" }],
                img: "/manus-storage/SteamedJasmineRice_f5e40e3e.jpg",
              },
              {
                name: "Roast Pork Platter",
                prices: [{ size: "Small", price: "$65", serves: "5–7 People" }, { size: "Medium", price: "$95", serves: "8–12 People" }, { size: "Large", price: "$125", serves: "15–20 People" }],
                img: "/manus-storage/RoastPorkPlatter_d7881898.jpg",
              },
              {
                name: "Roast Pork & Roast Duck Platter",
                prices: [{ size: "Small", price: "$95", serves: "5–7 People" }, { size: "Medium", price: "$138", serves: "8–12 People" }, { size: "Large", price: "$180", serves: "15–20 People" }],
                img: "/manus-storage/RoastPorkDuckPlatter_739f3dd1.jpg",
              },
              {
                name: "Roast Pork & BBQ Pork Platter",
                prices: [{ size: "Small", price: "$80", serves: "5–7 People" }, { size: "Medium", price: "$118", serves: "8–12 People" }, { size: "Large", price: "$155", serves: "15–20 People" }],
                img: "/manus-storage/RoastPorkBBQPorkPlatter_8d0da620.jpg",
              },
              {
                name: "Stir-Fried Noodles",
                note: "Choice of: Singapore Noodles · Soft Egg Noodles · Flat Rice Noodles",
                prices: [{ size: "Small", price: "$82", serves: "5–7 People" }, { size: "Medium", price: "$120", serves: "8–12 People" }, { size: "Large", price: "$158", serves: "15–20 People" }],
                img: "/manus-storage/StirFriedNoodles_23279f91.jpg",
              },
              {
                name: "Stir-Fried Hot Dish",
                prices: [{ size: "Small", price: "$82", serves: "5–7 People" }, { size: "Medium", price: "$120", serves: "8–12 People" }, { size: "Large", price: "$158", serves: "15–20 People" }],
                img: "/manus-storage/StirFriedHotDish_16c653d6.jpg",
              },
              {
                name: "Stir-Fried Mixed Vegetables with Tofu",
                prices: [{ size: "Small", price: "$60", serves: "5–7 People" }, { size: "Medium", price: "$88", serves: "8–12 People" }, { size: "Large", price: "$115", serves: "15–20 People" }],
                img: "/manus-storage/StirFriedVegTofu_5daed2ed.jpg",
              },
            ].map((item, i) => (
              <div key={i} className="bg-brand-cream overflow-hidden hover:shadow-md transition-shadow duration-300 group flex flex-col h-full">
                <div className="relative aspect-square overflow-hidden">
                  <img loading="lazy" src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h4 className="font-serif text-brand-dark text-xl mb-1">{item.name}</h4>
                  {'note' in item && item.note && <p className="text-xs text-brand-dark/50 italic mb-2">{item.note}</p>}
                  <div className="space-y-1 mt-2 flex-1">
                    {'prices' in item && item.prices.map((p, j) => (
                      <div key={j} className="flex items-center justify-between text-sm">
                        <span className="text-brand-dark/60">{p.size} <span className="text-xs text-brand-dark/40">({p.serves})</span></span>
                        <span className="font-bold text-brand-red">{p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Protein note */}
          <div className="bg-brand-dark text-white p-6 text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-2">CHOOSE YOUR PROTEIN</p>
            <p className="text-white/80 text-sm">Crispy Roast Pork · BBQ Pork · Satay Chicken · Fried Chicken · Lemongrass Chicken · Lemongrass Beef · Veggie & Tofu · Grilled Prawns · BBQ Duck</p>
            <p className="text-white/50 text-xs mt-2">Mixed selection recommended · Custom selection available (max 2–3 options) · Additional charge for premium flavours</p>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Star size={24} className="text-brand-amber mx-auto mb-6" />
          <blockquote className="font-serif text-white text-2xl md:text-3xl leading-relaxed mb-6">
            "Saigon Express catered our company's annual conference for 120 guests. The food was incredible — fresh, flavourful, and everyone was asking for the recipe."
          </blockquote>
          <p className="text-white/50 text-sm font-medium">— Corporate Client, Hobart CBD</p>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="catering-enquiry-form" className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-3">GET IN TOUCH</p>
              <h2 className="font-serif text-brand-dark text-4xl mb-4">Request a Catering Quote</h2>
              <p className="text-brand-dark/55 leading-relaxed mb-6 text-sm">
                Tell us about your event and we'll get back to you within 24 hours with a tailored quote. No event is too big or too small.
              </p>
              <div className="space-y-3 text-sm text-brand-dark/60">
                <div className="flex items-center gap-3"><Clock size={16} className="text-brand-red" /> Response within 24 hours</div>
                <div className="flex items-center gap-3"><Users size={16} className="text-brand-red" /> Minimum 10 guests</div>
                <div className="flex items-center gap-3"><CheckCircle size={16} className="text-brand-red" /> Free consultation included</div>
                <div className="flex items-center gap-3"><MapPin size={16} className="text-brand-red" /> Tasmania-wide delivery available</div>
              </div>
              <div className="mt-8 p-5 bg-brand-cream border-l-4 border-brand-red">
                <p className="font-semibold text-brand-dark text-sm mb-2">Direct catering enquiries:</p>
                <div className="flex items-center gap-2 text-sm text-brand-dark/70 mb-1">
                  <Phone size={13} className="text-brand-red" />
                  <a href="tel:0416036016" className="hover:text-brand-red transition-colors">0416 036 016</a>
                </div>
                <a href="mailto:catering@saigonexpress.com.au" className="text-brand-red font-bold hover:underline text-sm">catering@saigonexpress.com.au</a>
              </div>
            </div>

            <div>
              {submitted ? (
                <div className="bg-brand-cream p-10 text-center">
                  <CheckCircle size={40} className="text-brand-red mx-auto mb-4" />
                  <h3 className="font-serif text-2xl text-brand-dark mb-2">Enquiry Received!</h3>
                  <p className="text-brand-dark/55 text-sm">We'll be in touch within 24 hours with your personalised catering quote.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Your Name *</label>
                      <input type="text" required value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Organisation</label>
                      <input type="text" value={form.businessName} onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Email *</label>
                      <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">
                        Event Date <span className="text-brand-red font-normal normal-case text-[10px]">— min. 24 hrs notice required</span>
                      </label>
                      <input type="date" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
                        min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Number of Guests</label>
                      <input type="number" min="10" value={form.guestCount} onChange={e => setForm(p => ({ ...p, guestCount: e.target.value }))}
                        className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5">Tell Us About Your Event</label>
                    <textarea rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Event type, dietary requirements, preferred pack, any special requests..."
                      className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-colors bg-brand-cream resize-none" />
                  </div>
                  <button type="submit" disabled={submitInquiry.isPending}
                    className="w-full bg-brand-red text-white py-4 font-semibold text-sm hover:bg-brand-red/90 transition-colors disabled:opacity-50">
                    {submitInquiry.isPending ? "Sending Enquiry…" : "Send Catering Enquiry"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
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
