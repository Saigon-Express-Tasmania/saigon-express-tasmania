"use client";

import AppImage from "@/components/AppImage";
import { useState } from "react";
import Link from "@/components/link";
import { ArrowLeft, Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";

const LOCATIONS = [
  { name: "Hobart CBD", address: "Shop 4, 123 Elizabeth St, Hobart TAS 7000", phone: "0416 036 016" },
  { name: "Launceston", address: "45 Brisbane St, Launceston TAS 7250", phone: "0416 036 016" },
  { name: "Glenorchy", address: "12 Main Rd, Glenorchy TAS 7010", phone: "0416 036 016" },
  { name: "Devonport", address: "78 Rooke St, Devonport TAS 7310", phone: "0416 036 016" },
  { name: "Burnie", address: "34 Wilson St, Burnie TAS 7320", phone: "0416 036 016" },
  { name: "Sandy Bay", address: "99 Sandy Bay Rd, Sandy Bay TAS 7005", phone: "0416 036 016" },
  { name: "Moonah", address: "56 Main Rd, Moonah TAS 7009", phone: "0416 036 016" },
  { name: "Kingston", address: "22 Channel Hwy, Kingston TAS 7050", phone: "0416 036 016" },
];

const HOURS = [
  { day: "Monday – Friday", hours: "10:00 am – 8:00 pm" },
  { day: "Saturday", hours: "10:00 am – 8:30 pm" },
  { day: "Sunday", hours: "11:00 am – 7:00 pm" },
  { day: "Public Holidays", hours: "11:00 am – 6:00 pm" },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const submitContact = trpc.public.submitContactMessage.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Message sent! We'll get back to you soon.");
    },
    onError: () => toast.error("Failed to send message. Please try again or email us directly."),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    submitContact.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      subject: form.subject.trim() || undefined,
      message: form.message.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Top bar */}
      <div className="bg-brand-dark text-white text-xs py-2 px-4 text-center tracking-wide">
        Fresh · Healthy · Vietnamese — 8 locations across Tasmania
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-brand-dark/50 hover:text-brand-red transition-colors text-sm font-medium">
            <ArrowLeft size={15} /> Back to Home
          </Link>
          <Link href="/">
            <AppImage src={LOGO_URL} alt="Saigon Express Tasmania" width={180} height={40} priority className="h-10 w-auto object-contain" />
          </Link>
          <Link href="/menu">
            <Button className="bg-brand-red hover:bg-brand-red/90 text-white text-sm font-semibold px-4 py-2">
              Order Online
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand-dark py-16 px-6">
        <div className="max-w-[1280px] mx-auto">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-3">GET IN TOUCH</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl leading-tight mb-4">Contact Us</h1>
          <p className="text-white/60 text-base max-w-xl">
            We'd love to hear from you — whether it's a question about our menu, catering enquiry, franchise opportunity, or just a hello.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[1280px] mx-auto px-6 py-14 grid md:grid-cols-2 gap-14">

        {/* Left: contact info */}
        <div className="space-y-10">
          {/* Quick contact */}
          <div>
            <h2 className="font-serif text-brand-dark text-2xl mb-5">Get in Touch</h2>
            <div className="space-y-4">
              <a href="tel:0416036016" className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-red/20 transition-colors">
                  <Phone size={18} className="text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-brand-dark/40 uppercase tracking-wider font-semibold mb-0.5">Phone</p>
                  <p className="text-brand-dark font-semibold group-hover:text-brand-red transition-colors">0416 036 016</p>
                </div>
              </a>
              <a href="mailto:info@saigonexpress.com.au" className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-red/20 transition-colors">
                  <Mail size={18} className="text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-brand-dark/40 uppercase tracking-wider font-semibold mb-0.5">Email</p>
                  <p className="text-brand-dark font-semibold group-hover:text-brand-red transition-colors">info@saigonexpress.com.au</p>
                </div>
              </a>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-brand-dark/40 uppercase tracking-wider font-semibold mb-0.5">Locations</p>
                  <p className="text-brand-dark font-semibold">8 stores across Tasmania</p>
                </div>
              </div>
            </div>
          </div>

          {/* Opening hours */}
          <div>
            <h2 className="font-serif text-brand-dark text-2xl mb-5 flex items-center gap-2">
              <Clock size={20} className="text-brand-red" /> Opening Hours
            </h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {HOURS.map((h, i) => (
                <div key={h.day} className={`flex justify-between items-center px-5 py-3.5 text-sm ${i < HOURS.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <span className="text-brand-dark/70 font-medium">{h.day}</span>
                  <span className="text-brand-dark font-semibold">{h.hours}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <h2 className="font-serif text-brand-dark text-2xl mb-5">Our Locations</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {LOCATIONS.map(loc => (
                <div key={loc.name} className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="font-bold text-brand-dark text-sm mb-1">{loc.name}</p>
                  <p className="text-brand-dark/50 text-xs leading-relaxed">{loc.address}</p>
                </div>
              ))}
            </div>
            <Link href="/stores" className="inline-flex items-center gap-1.5 text-brand-red text-sm font-semibold mt-4 hover:underline">
              View all stores on map →
            </Link>
          </div>
        </div>

        {/* Right: contact form */}
        <div>
          <h2 className="font-serif text-brand-dark text-2xl mb-6">Send Us a Message</h2>
          {submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="font-serif text-brand-dark text-xl mb-2">Message Received!</h3>
              <p className="text-brand-dark/60 text-sm mb-6">Thanks for reaching out. We'll get back to you within 1 business day.</p>
              <Button
                onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                variant="outline"
                className="border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">Name *</label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">Email *</label>
                  <Input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20"
                    required
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">Phone</label>
                  <Input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="04xx xxx xxx"
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">Subject</label>
                  <Input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="e.g. Catering enquiry"
                    className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-dark/60 uppercase tracking-wider mb-1.5">Message *</label>
                <Textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  rows={5}
                  className="border-gray-200 focus:border-brand-red focus:ring-brand-red/20 resize-none"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitContact.isPending}
                className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-semibold py-3 gap-2"
              >
                {submitContact.isPending ? "Sending…" : <><Send size={16} /> Send Message</>}
              </Button>
              <p className="text-brand-dark/40 text-xs text-center">We typically respond within 1 business day.</p>
            </form>
          )}
        </div>
      </div>

      {/* Footer strip */}
      <div className="bg-brand-dark text-white/40 text-xs text-center py-6 mt-4">
        © {new Date().getFullYear()} Saigon Express Tasmania · <a href="tel:0416036016" className="hover:text-white transition-colors">0416 036 016</a> · <a href="mailto:info@saigonexpress.com.au" className="hover:text-white transition-colors">info@saigonexpress.com.au</a>
      </div>
    </div>
  );
}
