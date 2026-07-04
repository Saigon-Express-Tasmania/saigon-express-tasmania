"use client";

import AppImage from "@/components/AppImage";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSiteSetting } from "@/contexts/SiteContentContext";
import { useFormattedContactPhone } from "@/hooks/useFormattedContactPhone";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronRight,
  Phone,
  MapPin,
  MessageCircle,
  X,
} from "lucide-react";
import { AnimationOnScroll } from "@/components/AnimationOnScroll";
import Image from "next/image";

interface StripItem {
  num: string;
  label: string;
}

interface StepItem {
  num: string;
  title: string;
  desc: string;
}

interface OpportunityItem {
  name: string;
  imageSrc: string;
  imageAlt: string;
  description: string;
  highlightLabel: string;
  highlights: string[];
}

interface GrowthAreaItem {
  name: string;
  imageSrc: string;
  imageAlt: string;
  advantage: string;
  recommendedFormat: string;
}

interface FranchiseModelItem {
  name: string;
  imageSrc: string;
  imageAlt: string;
  floorSpace: string;
  investment: string;
  idealFor: string;
  features: string[];
  featured?: boolean;
}

interface FaqItem {
  question: string;
  answer: string[];
}

const EXISTING_STORE_OPPORTUNITIES: OpportunityItem[] = [
  {
    name: "Saigon Express North Hobart",
    imageSrc: "/images/franchise-opportunity-north-hobart.png",
    imageAlt: "Saigon Express North Hobart opportunity",
    description:
      "Situated in Hobart's undisputed culinary heart. Unbeatable foot traffic and a proven local hunger for premium Asian cuisine guarantee a steady stream of dine-in, takeaway, and delivery orders seven days a week.",
    highlightLabel: "Ideal for",
    highlights: [
      "Hands-on owner-operators",
      "Hospitality professionals",
      "Investors with a strong store manager",
    ],
  },
  {
    name: "Saigon Express Hobart CBD",
    imageSrc: "/images/franchise-opportunity-hobart-cbd.jpg",
    imageAlt: "Saigon Express Hobart CBD opportunity",
    description:
      "Capture the high-volume corporate and tourist crowd. With guaranteed daily footfall in the city center, this location offers massive lunch trade and highly lucrative corporate catering opportunities.",
    highlightLabel: "Key potential",
    highlights: [
      "Strong lunch trade",
      "Takeaway and delivery growth",
      "Corporate catering opportunities",
    ],
  },
  {
    name: "Saigon Express Lounge & Bar",
    imageSrc: "/images/franchise-opportunity-lounge-bar.png",
    imageAlt: "Saigon Express Lounge and Bar opportunity",
    description:
      "A rare opportunity to dominate the premium Asian-fusion nightlife space. High-margin experiential dining with a full bar setup, perfect for capturing the lucrative group dining and private function market.",
    highlightLabel: "Ideal for",
    highlights: [
      "Experienced restaurant operators",
      "Hospitality investors",
      "Partners interested in a full-service venue",
    ],
  },
  {
    name: "Saigon Express Sorell",
    imageSrc: "/images/franchise-opportunity-sorell.jpg",
    imageAlt: "Saigon Express Sorell opportunity",
    description:
      "A booming regional hub with a captive audience. This location capitalizes on a rapidly expanding local population and established community demand, offering a virtual monopoly on premium Vietnamese takeaway.",
    highlightLabel: "Key potential",
    highlights: [
      "Established community demand",
      "Strong takeaway opportunity",
      "Growing local population",
    ],
  },
  {
    name: "Saigon Express Gateway Sorell",
    imageSrc: "/images/franchise-opportunity-gateway-sorell.png",
    imageAlt: "Saigon Express Gateway Sorell opportunity",
    description:
      "Positioned inside a high-traffic retail environment. Enjoy consistent, built-in foot traffic from daily shoppers seeking fast, high-quality meals, ensuring repeat local customers and a fast return on investment.",
    highlightLabel: "Ideal for",
    highlights: [
      "First-time hospitality business owners",
      "Retail-focused operators",
      "Partners seeking efficiency",
    ],
  },
];

const NEW_GROWTH_AREAS: GrowthAreaItem[] = [
  {
    name: "Huonville",
    imageSrc: "/images/franchise-growth-huonville.jpg",
    imageAlt: "Huonville growth area opportunity",
    advantage:
      "Zero market saturation for premium Vietnamese food. Capitalize on a growing community of families and booming tourism in the Huon Valley. Be the absolute go-to destination for local lunches and takeaway.",
    recommendedFormat:
      "Takeaway + small dine-in area + local catering.",
  },
  {
    name: "Margate",
    imageSrc: "/images/franchise-growth-margate.jpg",
    imageAlt: "Margate growth area opportunity",
    advantage:
      "The ultimate gateway location capturing traffic between Hobart and the Channel region. Perfect demographic for family meals and a massive opportunity to corner the local delivery and catering market.",
    recommendedFormat:
      "Banh mi, pho, rice bowls, wok dishes, delivery and catering.",
  },
  {
    name: "Glenorchy",
    imageSrc: "/images/franchise-growth-glenorchy.png",
    imageAlt: "Glenorchy growth area opportunity",
    advantage:
      "Access one of Greater Hobart's busiest and most densely populated areas. Massive retail and residential traffic provides the perfect ecosystem for a high-volume, multi-channel (dine-in, delivery, catering) powerhouse.",
    recommendedFormat:
      "Full Saigon Express restaurant with dine-in, takeaway, Uber Eats, DoorDash and corporate catering.",
  },
];

const FRANCHISE_MODELS: FranchiseModelItem[] = [
  {
    name: "Express / Kiosk",
    imageSrc: "/images/franchise-model-kiosk.jpg",
    imageAlt: "Saigon Express kiosk franchise model",
    floorSpace: "30m² - 60m²",
    investment: "$150k - 250k",
    idealFor:
      "Shopping centre food courts and high foot-traffic transit hubs.",
    features: [
      "Highly efficient takeaway-focused model.",
      "Low overheads and minimal staffing required.",
      "Streamlined menu focusing on high-volume items like banh mi, rice paper rolls, and express pho.",
      "Fastest build time and quick return on investment.",
    ],
  },
  {
    name: "Classic Store",
    imageSrc: "/images/franchise-model-classic-store.jpg",
    imageAlt: "Saigon Express classic store franchise model",
    floorSpace: "70m² - 130m²",
    investment: "$280k - 450k",
    idealFor:
      "High street strips, suburban retail hubs, and standalone buildings.",
    features: [
      "Perfect balance of dine-in seating and takeaway flow.",
      "Serves the full traditional Saigon Express menu.",
      "Serves as a powerful hub for UberEats, DoorDash, and local delivery.",
      "Strong potential for corporate and local catering revenue.",
    ],
    featured: true,
  },
  {
    name: "Lounge & Bar",
    imageSrc: "/images/franchise-model-lounge-bar.png",
    imageAlt: "Saigon Express lounge and bar franchise model",
    floorSpace: "150m²+",
    investment: "$500k - 750k+",
    idealFor:
      "Premium dining precincts, entertainment districts, and CBD locations.",
    features: [
      "High-end experiential dining with premium interior fit-out.",
      "Full table service and potential for a licensed bar or cocktail menu.",
      "Designed to capture the highly lucrative dinner and group dining market.",
      "Dedicated space for private functions and events.",
    ],
  },
];

const FRANCHISE_PROCESS_STEPS: StepItem[] = [
  {
    num: "01",
    title: "Register Your Interest",
    desc: "Complete the enquiry form and tell us which existing location or growth area interests you.",
  },
  {
    num: "02",
    title: "Initial Discussion",
    desc: "Our team will speak with you about your experience, goals, investment capability and the right fit.",
  },
  {
    num: "03",
    title: "Confidentiality",
    desc: "For existing stores, selected commercial information is shared after a confidentiality agreement is signed.",
  },
  {
    num: "04",
    title: "Opportunity Info",
    desc: "Receive relevant information about the location, store model, requirements, and franchise support.",
  },
  {
    num: "05",
    title: "Due Diligence",
    desc: "Obtain independent legal, accounting and financial advice before making a business decision.",
  },
  {
    num: "06",
    title: "Partner Assessment",
    desc: "We assess the fit between your skills, operating plan and Saigon Express brand standards.",
  },
  {
    num: "07",
    title: "Agreement & Training",
    desc: "Once approved, enter the onboarding process, complete training and prepare for the store takeover.",
  },
  {
    num: "08",
    title: "Open Your Store",
    desc: "Officially become a Partner, supported through your launch and early operating period.",
  },
];

const FRANCHISE_FAQS: FaqItem[] = [
  {
    question: "Do I need previous hospitality or restaurant experience?",
    answer: [
      "Not necessarily. While prior business, retail, or management experience is highly valued, you do not need to be a chef. We provide a comprehensive training program that covers everything from our authentic food preparation to daily business operations. Our proven systems are built to be easily replicated by dedicated partners.",
    ],
  },
  {
    question: "Am I required to work in my business?",
    answer: [
      "Yes. Saigon Express requires the Franchise Partner to nominate a full-time Store Manager who is approved by our operations team. For single-unit Franchise Partners, this is typically the Franchise Partner themselves, who must devote their full time and effort to the day-to-day management and operation of the business, especially in the first 12 months.",
    ],
  },
  {
    question:
      "I'd like to invest, but cannot work in the business full-time. What are my options?",
    answer: [
      "You may choose to enter the business with a business partner who is approved by Saigon Express and will act as the full-time Store Manager. As an investor, you must ensure your operating partner is highly capable, properly incentivized, and heavily involved in the day-to-day operations.",
    ],
  },
  {
    question: "How much does it cost to open a store?",
    answer: [
      "This depends entirely on the location, size, and design of your store model. A fast-paced Express/Kiosk format can range from $150k - $250k, while a full Lounge & Bar can range from $500k - $750k+ (excluding GST and working capital). We provide full transparency on build costs during the enquiry process.",
    ],
  },
  {
    question: "How much cash contribution do I need to start with?",
    answer: [
      "Unlike other major franchise networks that require you to have 40-50% upfront cash contribution, we allow you to secure your location with a starting deposit of just $50,000. We are invested in finding the right people with the right drive, not just the richest investors.",
    ],
  },
  {
    question: "Can Saigon Express help me with finance?",
    answer: [
      "Yes. While other franchisors simply hand you off to a bank, we offer extensive, direct financial assistance and flexible terms tailored to your situation. If you have the operational drive, we will arrange a confidential meeting with the owner to discuss your customized financial pathway to get your doors open.",
    ],
  },
  {
    question: "What are the ongoing fees?",
    answer: [
      "Like all leading franchise networks, we charge an ongoing royalty fee and a marketing fund contribution, calculated as a percentage of your gross sales. These funds are directly reinvested into state-wide marketing campaigns, product innovation, central kitchen support, and protecting the strength of the Saigon Express brand.",
    ],
  },
  {
    question:
      "How much will my store turn over, and when will I return my investment?",
    answer: [
      "Each Saigon Express store operates in a different location and market, so turnover and payback periods vary. While we provide a proven business model, training, and ongoing support, the performance of your store ultimately depends on your commitment, local execution, and operating costs. We do not make representations or guarantees about future revenue; we encourage all applicants to conduct independent due diligence.",
    ],
  },
  {
    question: "How long is the training program?",
    answer: [
      'New franchise partners undergo an intensive 4 to 6-week training program at one of our flagship Hobart locations. This covers back-of-house food preparation, front-of-house customer service, point-of-sale systems, staff management, and business reporting. You will be "Saigon Express Ready" from day one.',
    ],
  },
  {
    question:
      "Who finds the location, negotiates the lease, and builds the store?",
    answer: [
      "For our defined growth areas, our corporate team manages the heavy lifting-from site negotiation and lease securing to store design and construction project management. If you are proposing your own location, we will work collaboratively with you to assess its commercial viability, secure the best lease terms, and build the store together.",
    ],
  },
  {
    question: "Where do I source my ingredients?",
    answer: [
      "To guarantee the authentic flavors that have made us famous, all core ingredients, secret marinades, and proprietary products are supplied through our central network and approved local Tasmanian suppliers. This ensures absolute consistency across all stores and leverages our group buying power to get you the best pricing.",
    ],
  },
  {
    question: "Can I own more than one Saigon Express location?",
    answer: [
      "Absolutely. Multi-unit ownership is highly encouraged for top-performing franchise partners who demonstrate strong operational capabilities and leadership. Similar to global QSR trends, many of our successful store owners will eventually choose to open a second location.",
    ],
  },
  {
    question: "What marketing support will I receive?",
    answer: [
      "You will be backed by a marketing machine. Support includes high-end food photography, social media management, opening launch campaigns, menu design, localized digital marketing, and promotional materials. We ensure your store gets maximum visibility in your local community.",
    ],
  },
  {
    question:
      "Why must I sign an NDA for the Saigon Express Franchise Process?",
    answer: [
      "We ask all potential franchise partners to sign a Non-Disclosure Agreement (NDA) to protect the confidential information we share during the franchise process. This includes details about our business model, operations, marketing strategies, financials, and supplier relationships - all the secret ingredients that make Saigon Express unique!",
      "The NDA helps ensure that this valuable information remains secure while you explore the exciting opportunity of joining the Saigon Express family. It's a standard step in the franchising world and a clear sign that we are serious about building a strong, trusting partnership from day one.",
    ],
  },
];

const FRANCHISE_SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const FRANCHISE_LAST_SUBMIT_KEY = "franchise_interest_last_submit_at";
const CONSULT_SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const CONSULT_LAST_SUBMIT_KEY = "franchise_consult_last_submit_at";

export default function FranchisePage() {
  const t = useTranslations("Franchise");
  const contactEmail = useSiteSetting("contact_us_email")?.trim();
  const contactPhone = useFormattedContactPhone();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestCooldownSeconds, setInterestCooldownSeconds] = useState(0);
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);
  const [consultCooldownSeconds, setConsultCooldownSeconds] = useState(0);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    investmentBudget: "",
    hasExperience: "no",
    message: "",
  });

  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [consultForm, setConsultForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const investmentStrip: StripItem[] = t.raw("investmentStrip");
  const interestCheckpoints: string[] = t.raw("interestForm.checkpoints");

  useEffect(() => {
    const updateCooldown = () => {
      const lastSubmitAt = Number(
        window.localStorage.getItem(FRANCHISE_LAST_SUBMIT_KEY) ?? "0",
      );
      const remainingMs =
        lastSubmitAt + FRANCHISE_SUBMIT_COOLDOWN_MS - Date.now();
      setInterestCooldownSeconds(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const updateCooldown = () => {
      const lastSubmitAt = Number(
        window.localStorage.getItem(CONSULT_LAST_SUBMIT_KEY) ?? "0",
      );
      const remainingMs =
        lastSubmitAt + CONSULT_SUBMIT_COOLDOWN_MS - Date.now();
      setConsultCooldownSeconds(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      toast.error(t("toasts.requiredMain"));
      return;
    }

    if (interestCooldownSeconds > 0) {
      const minutes = Math.floor(interestCooldownSeconds / 60);
      const seconds = interestCooldownSeconds % 60;
      const prettyRemaining = `${minutes}:${String(seconds).padStart(2, "0")}`;
      toast.error(`Please wait ${prettyRemaining} before submitting again.`);
      return;
    }

    setIsSubmittingInterest(true);
    try {
      const result = await invokeEdgeFunction<{ id: number; submitted: boolean }>(
        "franchise-interest",
        {
          body: {
            p_interest_type: "franchise",
            p_full_name: form.fullName,
            p_email: form.email,
            p_phone: form.phone || null,
            p_city: form.city || null,
            p_state: "Tasmania",
            p_investment_budget: form.investmentBudget || null,
            p_business_experience:
              form.hasExperience === "yes"
                ? t("interestForm.experiencePayloadYes")
                : t("interestForm.experiencePayloadNo"),
            p_preferred_date: null,
            p_preferred_time: null,
            p_message: form.message || null,
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(
        FRANCHISE_LAST_SUBMIT_KEY,
        String(Date.now()),
      );
      setInterestCooldownSeconds(
        Math.ceil(FRANCHISE_SUBMIT_COOLDOWN_MS / 1000),
      );
      setSubmitted(true);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !consultForm.name ||
      !consultForm.email ||
      !consultForm.phone ||
      !consultForm.preferredDate
    ) {
      toast.error(t("toasts.requiredConsult"));
      return;
    }

    if (consultCooldownSeconds > 0) {
      const minutes = Math.floor(consultCooldownSeconds / 60);
      const seconds = consultCooldownSeconds % 60;
      const prettyRemaining = `${minutes}:${String(seconds).padStart(2, "0")}`;
      toast.error(`Please wait ${prettyRemaining} before submitting again.`);
      return;
    }

    setIsSubmittingConsult(true);
    try {
      const result = await invokeEdgeFunction<{ id: number; submitted: boolean }>(
        "franchise-interest",
        {
          body: {
            p_interest_type: "consultation",
            p_full_name: consultForm.name,
            p_email: consultForm.email,
            p_phone: consultForm.phone || null,
            p_city: null,
            p_state: "Tasmania",
            p_investment_budget: null,
            p_business_experience: null,
            p_preferred_date: consultForm.preferredDate || null,
            p_preferred_time: consultForm.preferredTime || null,
            p_message: consultForm.message || null,
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(CONSULT_LAST_SUBMIT_KEY, String(Date.now()));
      setConsultCooldownSeconds(Math.ceil(CONSULT_SUBMIT_COOLDOWN_MS / 1000));
      setConsultSubmitted(true);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmittingConsult(false);
    }
  };

  const interestCooldownLabel = `${Math.floor(interestCooldownSeconds / 60)}:${String(
    interestCooldownSeconds % 60,
  ).padStart(2, "0")}`;
  const consultCooldownLabel = `${Math.floor(consultCooldownSeconds / 60)}:${String(
    consultCooldownSeconds % 60,
  ).padStart(2, "0")}`;

  return (
    <>
      <AnimationOnScroll />
      <div className="min-h-screen bg-brand-cream font-sans overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden py-16 md:py-24 lg:py-30 pt-8">
          {/* use Next/Image for this */}
          <Image
            src="/manus-storage/franchise__hero.png"
            alt="Franchise with Saigon Express Tasmania"
            fill
            priority
            className="absolute inset-0 object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

          <div className="relative z-10 w-full px-6 md:px-20 max-w-[1280px] mx-auto flex flex-col items-center text-center">
            <div data-aos="fade-down" data-aos-duration="1000">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-6">
              FRANCHISE WITH
              SAIGON EXPRESS TASMANIA
              </span>
            </div>

            <h1
              data-aos="fade-up"
              data-aos-duration="1200"
              data-aos-delay="200"
              className="font-serif text-white text-5xl md:text-7xl lg:text-8xl leading-tight max-w-[1280px] mb-6 drop-shadow-2xl"
            >
              OVER 10 YEARS 
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              OF EXCELLENCE. 
              </span>
            </h1>

            <div
              data-aos="fade-up"
              data-aos-duration="1200"
              data-aos-delay="400"
              className="text-white/80 text-lg md:text-xl max-w-[1280px] leading-relaxed mb-10 font-light"
            >
              <h2 className="text-white text-2xl md:text-3xl font-serif leading-snug mb-4">
              Join Our Family and Own a Part of Tasmania’s Premier Vietnamese Brand.
              </h2>
              <p className="mb-4">
                For more than a decade, Saigon Express has dominated the
                Tasmanian market with authentic Vietnamese food, proven systems,
                and the strength of a family-run network. We are inviting
                passionate business owners to join the next stage of our
                explosive growth.
              </p>
              <p>
                When you franchise with us, you aren&apos;t just buying a
                business; you are joining a legacy. We stand by our partners
                with unwavering support, flexible financial solutions, and a
                shared hunger for mutual success. From crispy banh mi to
                fragrant pho, our goal is simple: serve great food, create
                loyal customers, and build highly profitable local businesses.
              </p>
            </div>

            <div
              data-aos="fade-up"
              data-aos-duration="1200"
              data-aos-delay="600"
              className="flex flex-col sm:flex-row flex-wrap items-center gap-4"
            >
              <a
                href="#franchise-form"
                className="group relative overflow-hidden rounded-full bg-brand-red text-white px-8 py-4 font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:-translate-y-1 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Register Your Interest{" "}
                  <ChevronRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </a>
              <a
                href="#opportunities"
                className="rounded-full border border-white/30 backdrop-blur-sm text-white px-8 py-4 font-semibold text-sm hover:bg-white hover:text-brand-dark transition-all duration-300 w-full sm:w-auto text-center"
              >
                Explore Store Opportunities
              </a>
            </div>
          </div>
        </section>

        {/* Investment Summary Strip */}
        <section className="relative z-20 -mt-10 mx-6">
          <div
            data-aos="fade-up"
            className="max-w-[1000px] mx-auto bg-brand-red rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              {investmentStrip.map((s, i) => (
                <div
                  key={i}
                  data-aos="zoom-in"
                  data-aos-delay={i * 100}
                  className="px-6 py-10 text-center hover:bg-white/5 transition-colors duration-300"
                >
                  <div className="font-serif text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-md">
                    {s.num}
                  </div>
                  <div className="text-white/80 text-xs font-semibold uppercase tracking-widest leading-tight">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Existing Store Opportunities */}
        <section
          id="opportunities"
          className="py-24 bg-brand-cream relative overflow-hidden"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-brand-red/[0.05] blur-3xl" />
            <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-brand-dark/[0.04] blur-3xl" />
          </div>

          <div className="relative max-w-[1280px] mx-auto px-6">
            <div
              className="text-center mb-16 max-w-4xl mx-auto"
              data-aos="fade-up"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
                Existing Store Opportunities
              </p>
              <h2 className="font-serif text-brand-dark text-4xl lg:text-5xl leading-tight mb-6">
                Skip the startup phase.
              </h2>
              <p className="text-brand-dark/60 text-base md:text-lg leading-relaxed">
                These opportunities allow you to take over an established
                Saigon Express location with instant brand recognition,
                perfected operating systems, and a hungry, existing customer
                base.
              </p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {EXISTING_STORE_OPPORTUNITIES.map((location, i) => (
                <article
                  key={location.name}
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                  className="group overflow-hidden rounded-3xl bg-white border border-brand-dark/5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.18)] hover:shadow-[0_28px_60px_-20px_rgba(220,38,38,0.18)] transition-all duration-500 hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={location.imageSrc}
                      alt={location.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col p-8">
                    <h3 className="font-serif text-brand-dark text-2xl mb-4">
                      {location.name}
                    </h3>

                    <p className="text-brand-dark/65 text-sm leading-relaxed mb-6">
                      <strong className="text-brand-dark">
                        The Perfect Location:
                      </strong>{" "}
                      {location.description}
                    </p>

                    <div className="mt-auto">
                      <p className="text-xs font-bold tracking-[0.18em] uppercase text-brand-red mb-3">
                        {location.highlightLabel}
                      </p>
                      <ul className="space-y-2 mb-6">
                        {location.highlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="flex items-start gap-3 text-sm text-brand-dark/70"
                          >
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-amber shrink-0" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>

                      <a
                        href="#franchise-form"
                        className="group/button inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(220,38,38,0.28)]"
                      >
                        Request Info
                        <ChevronRight
                          size={16}
                          className="transition-transform group-hover/button:translate-x-1"
                        />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* New Growth Areas */}
        <section className="pt-0 pb-24 bg-brand-cream relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-24 left-0 h-[360px] w-[360px] rounded-full bg-brand-amber/[0.08] blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-brand-red/[0.04] blur-3xl" />
          </div>

          <div className="relative max-w-[1280px] mx-auto px-6">
            <div
              className="text-center mb-16 max-w-4xl mx-auto"
              data-aos="fade-up"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
                New Growth Areas
              </p>
              <h2 className="font-serif text-brand-dark text-4xl lg:text-5xl leading-tight mb-6">
                Seize the first-mover advantage.
              </h2>
              <p className="text-brand-dark/60 text-base md:text-lg leading-relaxed">
                We are actively seeking partners to dominate untapped,
                high-potential markets across Tasmania.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {NEW_GROWTH_AREAS.map((area, i) => (
                <article
                  key={area.name}
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-white border border-brand-dark/5 border-b-4 border-b-brand-amber shadow-[0_18px_50px_-20px_rgba(0,0,0,0.16)] hover:shadow-[0_28px_60px_-20px_rgba(215,163,67,0.28)] transition-all duration-500 hover:-translate-y-1"
                >
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={area.imageSrc}
                      alt={area.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 33vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/55 via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col p-8">
                    <h3 className="font-serif text-brand-dark text-2xl mb-4">
                      {area.name}
                    </h3>
                    <p className="text-brand-dark/65 text-sm leading-relaxed mb-6">
                      <strong className="text-brand-dark">The Advantage:</strong>{" "}
                      {area.advantage}
                    </p>

                    <div className="mt-auto rounded-2xl border-l-4 border-brand-red bg-brand-cream/60 px-5 py-4">
                      <p className="text-sm leading-relaxed text-brand-dark/70">
                        <strong className="text-brand-dark">
                          Recommended format:
                        </strong>{" "}
                        {area.recommendedFormat}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div
              data-aos="fade-up"
              className="mt-16 rounded-3xl border-2 border-dashed border-brand-amber/70 bg-white px-8 py-12 text-center shadow-[0_18px_50px_-24px_rgba(0,0,0,0.14)]"
            >
              <h3 className="font-serif text-brand-red text-3xl md:text-4xl mb-4">
                Have a Specific Location in Mind?
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed max-w-4xl mx-auto mb-5">
                Are you looking at a vacant premises in your local suburb? We
                are always open to visionary partners. If you have a specific
                location in mind, let&apos;s sit down and negotiate. We offer{" "}
                <strong className="text-brand-dark">
                  highly competitive franchise pricing
                </strong>{" "}
                and will work side-by-side with you to assess the site, secure
                the lease, and build the store from the ground up.
              </p>
              <p className="text-brand-red font-semibold text-base md:text-lg max-w-3xl mx-auto mb-8">
                Leverage our 10+ years of brand power to ensure your chosen
                location becomes an instant success. Let&apos;s expand our legacy
                together.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={contactEmail ? `mailto:${contactEmail}` : "#"}
                  className="inline-flex items-center justify-center rounded-full bg-brand-red px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(220,38,38,0.28)]"
                >
                  Pitch Us Your Location
                </a>
                <button
                  type="button"
                  onClick={() => setConsultModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-full border-2 border-brand-red px-8 py-4 text-sm font-semibold text-brand-red transition-all duration-300 hover:bg-brand-red hover:text-white"
                >
                  Register Interest for a New Area
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tailored Franchise Models */}
        <section
          id="models"
          className="relative py-24 lg:py-32 bg-brand-dark overflow-hidden"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 h-[520px] w-[520px] rounded-full bg-brand-amber/10 blur-[120px] translate-x-1/4 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 h-[520px] w-[520px] rounded-full bg-brand-red/10 blur-[120px] -translate-x-1/4 translate-y-1/4" />
          </div>

          <div className="relative max-w-[1280px] mx-auto px-6">
            <div
              className="text-center mb-16 max-w-4xl mx-auto"
              data-aos="fade-up"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-amber mb-4">
                Tailored Franchise Models
              </p>
              <h2 className="font-serif text-brand-amber text-4xl lg:text-5xl leading-tight mb-6">
                Flexible, proven store models built for ROI.
              </h2>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                We offer flexible, proven store models designed to maximize ROI
                across different real estate formats. From compact retail
                kiosks to full-scale dining lounges, there is a Saigon Express
                blueprint to fit your investment capacity and location.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {FRANCHISE_MODELS.map((model, i) => (
                <article
                  key={model.name}
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                  className={`group flex flex-col overflow-hidden rounded-3xl border transition-all duration-500 hover:-translate-y-1 ${
                    model.featured
                      ? "bg-white text-brand-dark border-brand-amber shadow-[0_28px_70px_-24px_rgba(245,158,11,0.3)]"
                      : "bg-white/5 backdrop-blur-sm text-white border-white/10 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.5)] hover:border-brand-amber/50"
                  }`}
                >
                  <div className="relative h-60 overflow-hidden">
                    <Image
                      src={model.imageSrc}
                      alt={model.imageAlt}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 33vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      className={`absolute inset-0 ${
                        model.featured
                          ? "bg-gradient-to-t from-white/25 via-transparent to-transparent"
                          : "bg-gradient-to-t from-brand-dark/70 via-transparent to-transparent"
                      }`}
                    />
                    {model.featured && (
                      <span className="absolute top-4 left-4 rounded-full bg-brand-red px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white shadow-lg">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-8">
                    <h3
                      className={`font-serif text-3xl mb-3 ${
                        model.featured ? "text-brand-dark" : "text-brand-amber"
                      }`}
                    >
                      {model.name}
                    </h3>

                    <p
                      className={`text-sm font-semibold mb-4 ${
                        model.featured ? "text-brand-dark/70" : "text-white/60"
                      }`}
                    >
                      Floor Space: {model.floorSpace}
                    </p>

                    <div className="mb-1">
                      <div
                        className={`font-serif text-4xl leading-none ${
                          model.featured ? "text-brand-red" : "text-white"
                        }`}
                      >
                        {model.investment}
                      </div>
                    </div>
                    <p
                      className={`text-xs mb-6 ${
                        model.featured ? "text-brand-dark/50" : "text-white/45"
                      }`}
                    >
                      + GST (Estimated Build)
                    </p>

                    <ul className="space-y-3 mb-8">
                      <li
                        className={`text-sm leading-relaxed ${
                          model.featured ? "text-brand-dark/70" : "text-white/70"
                        }`}
                      >
                        <strong
                          className={
                            model.featured ? "text-brand-dark" : "text-white"
                          }
                        >
                          Ideal for:
                        </strong>{" "}
                        {model.idealFor}
                      </li>
                      {model.features.map((feature) => (
                        <li
                          key={feature}
                          className={`flex items-start gap-3 text-sm leading-relaxed ${
                            model.featured ? "text-brand-dark/70" : "text-white/70"
                          }`}
                        >
                          <span
                            className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                              model.featured
                                ? "bg-brand-red"
                                : "bg-brand-amber"
                            }`}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href="#franchise-form"
                      className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                        model.featured
                          ? "bg-brand-red text-white hover:bg-brand-red/90 hover:shadow-[0_0_30px_rgba(220,38,38,0.28)]"
                          : "border border-brand-amber/60 text-brand-amber hover:bg-brand-amber hover:text-brand-dark"
                      }`}
                    >
                      Enquire Now
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-10 text-center text-xs italic leading-relaxed text-white/45 max-w-5xl mx-auto">
              * Estimated investment costs include store fit-out, equipment,
              signage, initial franchise fees, and training. Working capital
              and bank guarantees are additional. Remember, we offer financial
              assistance to the right partners to secure locations with just a
              $50k deposit.
            </p>
          </div>
        </section>

        {/* About Section */}
        <section className="py-24 bg-white">
          <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
            <div className="flex h-full flex-col gap-5 lg:self-stretch">
              <div
                data-aos="fade-right"
                className="relative min-h-[400px] flex-1 rounded-3xl overflow-hidden shadow-2xl group"
              >
                <div className="absolute inset-0 bg-brand-dark/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
                <AppImage
                  src="/manus-storage/IMG_43782_5753892a.jpg"
                  alt="Saigon Express opens new store"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-lg border border-white/20">
                  <p className="text-brand-red font-bold text-lg">
                    {t("about.imageOverlayTitle")}
                  </p>
                  <p className="text-brand-dark/60 text-xs">
                    {t("about.imageOverlaySubtitle")}
                  </p>
                </div>
              </div>

              <div
                data-aos="fade-up"
                className="p-6 bg-brand-dark rounded-2xl border-t-4 border-brand-amber text-sm shadow-2xl"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 rounded-full text-brand-amber shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="text-white/75 leading-relaxed">
                    <strong className="font-serif text-brand-amber inline-block mb-2 text-xl">
                      Flexible Store Formats
                    </strong>
                    <p className="mb-3">
                      Depending on the location, Saigon Express can be tailored
                      to suit different business models:
                    </p>
                    <ul className="space-y-2 list-disc pl-5 text-white/80">
                      <li>Takeaway-focused stores</li>
                      <li>Shopping centre locations</li>
                      <li>Dine-in restaurants and lounge concepts</li>
                      <li>Delivery-focused kitchens and catering hubs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div data-aos="fade-left" className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="h-px w-10 bg-brand-red" />
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red">
                  Why Saigon Express?
                </p>
              </div>
              <h3 className="font-serif text-brand-dark text-2xl mb-3">
                Over a Decade of Market Dominance
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-6">
                For more than 10 years, Saigon Express has been a pillar of the
                Tasmanian culinary scene. We have already done the heavy lifting
                of building brand loyalty, perfecting recipes, and establishing
                a fierce market presence. When you join us, you inherit a
                decade of goodwill and success.
              </p>
              <h3 className="font-serif text-brand-dark text-2xl mb-3">
                The Strength of a Family Partnership
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-6">
                Unlike massive, faceless corporations, Saigon Express treats
                every franchise partner like family. You have direct access to
                the founders, and your success is our personal mission. We
                protect our brand, and we passionately protect our partners&apos;
                investments.
              </p>
              <h3 className="font-serif text-brand-dark text-2xl mb-3">
                A trusted brand with unbeatable ROI
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-6">
                Saigon Express has built a formidable local presence through
                fresh food, welcoming service, and bulletproof operating
                systems. Our business is engineered to maximize profitability
                across all dayparts: lunch, dinner, takeaway, delivery, events,
                and corporate catering.
              </p>
              <h3 className="font-serif text-brand-dark text-2xl mb-3">
                A menu that creates multiple, high-margin revenue streams
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-6">
                We are more than banh mi. Our menu features pho, rice bowls,
                wok dishes, and catering platters. This diversity protects your
                business from seasonal dips and gives you unparalleled ability
                to capture every type of hungry customer.
              </p>
              <h3 className="font-serif text-brand-dark text-2xl mb-3">
                Practical, hands-on franchise support
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-8">
                We don&apos;t just hand you a manual and walk away. We provide
                intense, practical support to ensure your store is a
                hyper-efficient machine.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8 text-sm">
                {[
                  "Store operations training & food preparation systems",
                  "Menu development and quality standards",
                  "Staff recruitment and training guidance",
                  "Opening marketing, social media and menu design",
                  "Supplier guidance and central kitchen support",
                ].map((item, i) => (
                  <div
                    key={i}
                    data-aos="fade-up"
                    data-aos-delay={i * 100}
                    className="flex items-center gap-3 bg-brand-cream/50 p-3 rounded-xl border border-brand-dark/5"
                  >
                    <div className="bg-white rounded-full p-1 shadow-sm">
                      <CheckCircle
                        size={16}
                        className="text-brand-red flex-shrink-0"
                      />
                    </div>
                    <span className="text-brand-dark/80 font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="font-serif text-brand-dark text-2xl mb-3">
                Grow with the brand
              </h3>
              <p className="text-brand-dark/60 text-base leading-relaxed mb-8">
                We are looking for long-term partners who want to build a
                sustainable empire, not just operate a single store. Strong
                partners will be prioritized for highly lucrative multi-store
                opportunities.
              </p>

            </div>
          </div>
        </section>

        {/* Financial Support Section */}
        <section
          className="relative overflow-hidden px-6 py-24 text-white border-y-4 border-brand-amber"
          style={{
            background:
              "linear-gradient(135deg, #dc2626 0%, #991b1b 55%, #5a0e0e 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div
            className="relative z-10 max-w-5xl mx-auto text-center"
            data-aos="zoom-in"
          >
            <h2 className="font-serif text-brand-amber text-2xl md:text-3xl lg:text-4xl mb-6 uppercase leading-tight">
              Unprecedented Financial Support
            </h2>
            <p className="text-white/85 text-lg md:text-xl max-w-3xl mx-auto mb-10 font-light leading-relaxed">
              We believe in empowering passionate individuals. That is why we
              have shattered the financial barriers to entry.
            </p>

            <div className="max-w-4xl mx-auto rounded-3xl border border-brand-amber/30 bg-black/35 px-8 py-10 md:px-12 md:py-12 shadow-[0_15px_35px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <h3 className="text-white text-3xl md:text-4xl font-bold mb-4">
                Secure Your Location with Only a $50K Deposit
              </h3>
              <p className="text-white/80 text-base leading-8 mb-6">
                If you have the drive, the hunger for success, and the
                operational skills, we have the financial solutions to get you
                started. We offer flexible, tailored financing assistance to
                the right partners. Do not let upfront capital stop you from
                owning a highly profitable business.
              </p>
              <p className="text-brand-amber text-lg font-semibold mb-8 leading-relaxed">
                Contact us today to arrange a direct, confidential meeting with
                the owner to discuss your future and finalize your financial
                pathway.
              </p>
              <button
                onClick={() => setConsultModalOpen(true)}
                className="group inline-flex items-center gap-3 bg-white text-brand-red font-bold text-base px-10 py-5 rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
              >
                <MessageCircle size={22} className="group-hover:animate-bounce" />
                {t("consultBanner.btnBook")}
              </button>
            </div>
          </div>
        </section>

        {/* Who We Are Looking For */}
        <section className="py-24 bg-brand-dark relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-brand-amber/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-brand-red/10 blur-3xl" />
          </div>

          <div className="relative max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div
              data-aos="fade-right"
              className="relative h-full rounded-3xl overflow-hidden shadow-2xl"
            >
              <Image
                src="/images/franchise-who-we-are-looking-for.jpg"
                alt="Business owner"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-top"
              />
            </div>

            <div data-aos="fade-left" className="text-white">
              <h2 className="font-serif text-brand-amber text-4xl lg:text-5xl leading-tight mb-6">
                Who We Are Looking For
              </h2>
              <p className="text-white/75 text-base leading-relaxed mb-6">
                You do not need to be a chef or have owned a restaurant before.
                However, successful franchise partners need commitment,
                business discipline and a genuine focus on customer service.
              </p>
              <p className="text-white font-semibold mb-5">
                We are looking for people with:
              </p>

              <ul className="space-y-4">
                {[
                  "Suitable investment capacity",
                  "Hospitality, retail, management or customer-service experience",
                  "Strong leadership and people-management skills",
                  "A willingness to protect food quality and brand standards",
                  "A hands-on approach to operating a business",
                  "A long-term mindset",
                  "Interest in local marketing and community engagement",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-white/85 leading-relaxed"
                  >
                    <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/10">
                      <CheckCircle size={14} className="text-brand-amber" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Franchise Process */}
        <section className="py-24 lg:py-32 bg-[#0a0a0a] relative overflow-hidden border-t border-white/10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-red/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-amber/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="max-w-[1280px] mx-auto px-6 relative z-10">
            <div
              className="flex flex-col items-center text-center mb-16 max-w-4xl mx-auto"
              data-aos="fade-up"
            >
              <h2 className="font-serif text-white text-4xl lg:text-5xl xl:text-6xl tracking-tight leading-[1.15] mb-6">
                The Franchise Process
              </h2>
              <p className="text-white/65 text-base md:text-lg leading-relaxed">
                From your initial enquiry to opening your doors, we guide you
                through every step of the journey.
              </p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 relative">
              {FRANCHISE_PROCESS_STEPS.map((s, i) => (
                <div
                  key={s.num}
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                  className="group relative bg-[#141414]/80 backdrop-blur-md rounded-3xl p-8 border border-white/5 hover:border-brand-amber/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="absolute -bottom-6 -right-4 text-9xl font-serif font-black text-white/[0.02] group-hover:text-brand-amber/[0.05] group-hover:-translate-y-4 transition-all duration-700 pointer-events-none select-none">
                    {s.num}
                  </div>

                  <div className="relative z-10 mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-brand-amber text-xl font-serif font-bold">
                    {s.num}
                  </div>

                  <h3 className="font-serif text-white text-2xl mb-4 relative z-10 group-hover:text-brand-amber transition-colors duration-300">
                    {s.title}
                  </h3>

                  <p className="text-white/55 text-sm leading-relaxed relative z-10 group-hover:text-white/80 transition-colors duration-300">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section id="franchise-form" className="py-24 bg-brand-cream relative">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col lg:flex-row">
              {/* Info Column */}
              <div className="lg:w-5/12 p-10 lg:p-16 bg-gradient-to-br from-brand-dark to-black text-white relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-brand-red/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-amber/10 rounded-full blur-3xl" />

                <div className="relative z-10" data-aos="fade-right">
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
                    Franchise Enquiry
                  </p>
                  <h2 className="font-serif text-4xl lg:text-5xl mb-6">
                    Start Your Saigon Express Journey
                  </h2>
                  <p className="text-white/70 leading-relaxed mb-10 text-sm">
                    Whether you want an existing store or a new territory, we
                    are ready to welcome you to the family. With just a $50k
                    deposit and our financial backing, your dream business is
                    within reach.
                  </p>
                  <div className="space-y-4 text-sm text-white/80 mb-12">
                    {interestCheckpoints.map((cp, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="bg-brand-red/20 p-1.5 rounded-full">
                          <CheckCircle size={16} className="text-brand-red" />
                        </div>
                        {cp}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                    <p className="font-serif text-lg mb-4 text-brand-amber">
                      Book a Meeting With The Owner
                    </p>
                    <div className="space-y-3">
                      {contactEmail ? (
                        <a
                          href={`mailto:${contactEmail}`}
                          className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-amber/15 flex items-center justify-center">
                            <MessageCircle
                              size={14}
                              className="text-brand-amber"
                            />
                          </div>
                          <span>
                            Email:{" "}
                            <span className="font-medium text-brand-amber">
                              {contactEmail}
                            </span>
                          </span>
                        </a>
                      ) : null}
                      {contactPhone ? (
                        <a
                          href={contactPhone.telHref}
                          className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Phone size={14} className="text-brand-amber" />
                          </div>
                          <span>
                            Phone:{" "}
                            <span className="font-medium text-brand-amber">
                              {contactPhone.display}
                            </span>
                          </span>
                        </a>
                      ) : null}
                      <div className="flex items-center gap-3 text-sm text-white/80">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <MapPin size={14} className="text-brand-amber" />
                        </div>
                        <span>Level 2, 86 Collins St, Hobart TAS 7000</span>
                      </div>
                    </div>
                    <p className="mt-5 text-[11px] leading-relaxed text-white/50">
                      The information on this page is provided for general
                      franchise enquiry purposes only. It does not constitute
                      financial advice, a profit guarantee or an offer to sell
                      a franchise. Applicants should obtain independent legal,
                      financial and accounting advice before making any
                      investment decision.
                    </p>
                    <p className="mt-4 text-[11px] text-white/35">
                      Copyright 2026 Saigon Express Tasmania. All Rights
                      Reserved.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Column */}
              <div className="lg:w-7/12 p-10 lg:p-16">
                {submitted ? (
                  <div
                    className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12"
                    data-aos="zoom-in"
                  >
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
                      <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-serif text-3xl text-brand-dark mb-3">
                        {t("interestForm.successTitle")}
                      </h3>
                      <p className="text-brand-dark/60 text-base max-w-md mx-auto">
                        {t("interestForm.successText")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    data-aos="fade-left"
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputName")}
                        </label>
                        <input
                          type="text"
                          required
                          value={form.fullName}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, fullName: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputEmail")}
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, email: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputPhone")}
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, phone: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputLocation")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("interestForm.placeholderLocation")}
                          value={form.city}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, city: e.target.value }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputBudget")}
                        </label>
                        <select
                          value={form.investmentBudget}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              investmentBudget: e.target.value,
                            }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none appearance-none"
                        >
                          <option value="">
                            {t("interestForm.placeholderBudget")}
                          </option>
                          <option>$80K – $120K (Kiosk)</option>
                          <option>$120K – $180K (Takeaway)</option>
                          <option>$180K – $280K (Restaurant)</option>
                          <option>$280K+ (Multiple sites)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                          {t("interestForm.inputExperience")}
                        </label>
                        <select
                          value={form.hasExperience}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              hasExperience: e.target.value,
                            }))
                          }
                          className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none appearance-none"
                        >
                          <option value="no">
                            {t("interestForm.experienceOptions.no")}
                          </option>
                          <option value="yes">
                            {t("interestForm.experienceOptions.yes")}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("interestForm.inputAbout")}
                      </label>
                      <textarea
                        rows={4}
                        value={form.message}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, message: e.target.value }))
                        }
                        placeholder={t("interestForm.placeholderAbout")}
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-5 py-3.5 text-sm transition-all outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isSubmittingInterest || interestCooldownSeconds > 0
                      }
                      className="w-full bg-brand-red text-white py-4 mt-4 rounded-xl font-bold text-sm hover:bg-brand-red/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {isSubmittingInterest
                        ? t("interestForm.btnSubmitting")
                        : t("interestForm.btnSubmit")}
                    </button>
                    {interestCooldownSeconds > 0 && (
                      <p className="text-xs font-semibold text-brand-red text-center">
                        Please wait {interestCooldownLabel} before submitting
                        again.
                      </p>
                    )}
                    <p className="text-[11px] text-brand-dark/40 text-center uppercase tracking-widest mt-4">
                      {t("interestForm.confidentialNote")}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="py-24 bg-white relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-brand-red/[0.04] blur-3xl" />
            <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-brand-amber/[0.05] blur-3xl" />
          </div>

          <div className="relative max-w-[980px] mx-auto px-6">
            <div
              className="text-center mb-14 max-w-3xl mx-auto"
              data-aos="fade-up"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-red mb-4">
                Frequently Asked Questions
              </p>
              <h2 className="font-serif text-brand-dark text-4xl lg:text-5xl leading-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {FRANCHISE_FAQS.map((faq, index) => {
                const isOpen = openFaqIndex === index;

                return (
                  <div
                    key={faq.question}
                    data-aos="fade-up"
                    data-aos-delay={index * 50}
                    className="rounded-3xl border border-brand-dark/8 bg-brand-cream/35 shadow-[0_10px_35px_-20px_rgba(0,0,0,0.12)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIndex(isOpen ? null : index)
                      }
                      className="flex w-full items-center justify-between gap-6 px-7 py-6 text-left"
                      aria-expanded={isOpen}
                    >
                      <h3 className="font-serif text-brand-dark text-xl md:text-2xl leading-snug">
                        {faq.question}
                      </h3>
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-red/15 bg-white text-brand-red transition-all duration-300 ${
                          isOpen
                            ? "rotate-90 bg-brand-red text-white border-brand-red"
                            : ""
                        }`}
                      >
                        <ChevronRight size={18} color={isOpen ? "white" : undefined} />
                      </span>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-7 pb-7">
                          <div className="h-px w-full bg-brand-dark/10 mb-5" />
                          <div className="space-y-4 text-brand-dark/65 text-base leading-relaxed">
                            {faq.answer.map((paragraph, paragraphIndex) => (
                              <p key={paragraphIndex}>{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Modal Overlay (Glassmorphism effect added) */}
        {consultModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            onClick={() => setConsultModalOpen(false)}
          >
            <div
              data-aos="zoom-in"
              data-aos-duration="300"
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-brand-dark">
                    {t("consultModal.title")}
                  </h3>
                  <p className="text-sm text-brand-dark/50 mt-1">
                    {t("consultModal.subtitle")}
                  </p>
                </div>
                <button
                  onClick={() => setConsultModalOpen(false)}
                  className="p-2 rounded-full hover:bg-red-50 hover:text-brand-red transition-colors"
                >
                  <X
                    size={20}
                    className="text-brand-dark/50 hover:text-brand-red"
                  />
                </button>
              </div>

              {consultSubmitted ? (
                <div className="px-8 py-14 text-center">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <h4 className="font-serif text-2xl font-bold text-brand-dark mb-3">
                    {t("consultModal.successTitle")}
                  </h4>
                  <p className="text-brand-dark/60 text-sm leading-relaxed mb-8">
                    {t("consultModal.successText", {
                      name: consultForm.name,
                      email: consultForm.email,
                    })}
                  </p>
                  <button
                    onClick={() => {
                      setConsultModalOpen(false);
                      setConsultSubmitted(false);
                      setConsultForm({
                        name: "",
                        email: "",
                        phone: "",
                        preferredDate: "",
                        preferredTime: "",
                        message: "",
                      });
                    }}
                    className="bg-brand-red text-white px-10 py-3.5 rounded-full font-bold text-sm hover:bg-brand-red/90 hover:shadow-lg transition-all"
                  >
                    {t("consultModal.btnClose")}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleConsultSubmit}
                  className="px-8 py-8 space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputName")}
                      </label>
                      <input
                        required
                        value={consultForm.name}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            name: e.target.value,
                          }))
                        }
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                        placeholder={t("consultModal.placeholderName")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputPhone")}
                      </label>
                      <input
                        required
                        value={consultForm.phone}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                        placeholder={t("consultModal.placeholderPhone")}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                      {t("consultModal.inputEmail")}
                    </label>
                    <input
                      required
                      type="email"
                      value={consultForm.email}
                      onChange={(e) =>
                        setConsultForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      placeholder={t("consultModal.placeholderEmail")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputDate")}
                      </label>
                      <input
                        type="date"
                        required
                        value={consultForm.preferredDate}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            preferredDate: e.target.value,
                          }))
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                        {t("consultModal.inputTime")}
                      </label>
                      <select
                        value={consultForm.preferredTime}
                        onChange={(e) =>
                          setConsultForm((f) => ({
                            ...f,
                            preferredTime: e.target.value,
                          }))
                        }
                        className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">
                          {t("consultModal.timeOptions.any")}
                        </option>
                        <option value="Morning (9am–12pm)">
                          {t("consultModal.timeOptions.morning")}
                        </option>
                        <option value="Afternoon (12pm–5pm)">
                          {t("consultModal.timeOptions.afternoon")}
                        </option>
                        <option value="Evening (5pm–7pm)">
                          {t("consultModal.timeOptions.evening")}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-dark/70 uppercase tracking-widest pl-1">
                      {t("consultModal.inputMessage")}
                    </label>
                    <textarea
                      rows={3}
                      value={consultForm.message}
                      onChange={(e) =>
                        setConsultForm((f) => ({
                          ...f,
                          message: e.target.value,
                        }))
                      }
                      className="w-full bg-brand-cream/50 border-transparent focus:bg-white border focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/10 rounded-xl px-4 py-3 text-sm transition-all outline-none resize-none"
                      placeholder={t("consultModal.placeholderMessage")}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingConsult || consultCooldownSeconds > 0}
                    className="w-full bg-brand-red text-white py-4 mt-2 rounded-xl font-bold text-sm hover:bg-brand-red/90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {isSubmittingConsult ? (
                      t("consultModal.btnSubmitting")
                    ) : (
                      <>
                        <MessageCircle size={18} />{" "}
                        {t("consultModal.btnSubmit")}
                      </>
                    )}
                  </button>
                  {consultCooldownSeconds > 0 && (
                    <p className="text-xs font-semibold text-brand-red text-center">
                      Please wait {consultCooldownLabel} before submitting
                      again.
                    </p>
                  )}
                  <p className="text-[10px] text-brand-dark/30 text-center uppercase tracking-widest">
                    {t("interestForm.confidentialNote")}
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
