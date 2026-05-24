"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "@/components/link";
import { ChevronRight, MapPin, Clock, DollarSign, Users, ChevronDown, ChevronUp, Mail, Phone, Briefcase, Star, Heart, Zap } from "lucide-react";

const LOGO_URL = "/manus-storage/saigon-express-logo-transparent_62bc8ecb.png";

const NAV_LINKS = [
  { href: "/menu", label: "Our Food" },
  { href: "/wholesale-shop", label: "Wholesale Shop" },
  { href: "/catering", label: "Catering" },
  { href: "/franchise", label: "Franchise" },
  { href: "/stores", label: "Find Us" },
  { href: "/careers", label: "Careers" },
];

const PORTAL_LINKS = [
  { href: "/portals/franchise", label: "Franchise Portal" },
  { href: "/portals/wholesale", label: "Wholesale Portal" },
  { href: "/portals/warehouse", label: "Warehouse Portal" },
];

const FOOTER_LINKS = {
  explore: [
    { href: "/menu", label: "Our Food" },
    { href: "/catering", label: "Catering" },
    { href: "/stores", label: "Find Us" },
    { href: "/careers", label: "Careers" },
  ],
  business: [
    { href: "/wholesale-shop", label: "Wholesale Shop" },
    { href: "/franchise", label: "Franchise" },
    { href: "/portals/wholesale", label: "Wholesale Portal" },
    { href: "/portals/franchise", label: "Franchise Portal" },
  ],
};

const JOBS = [
  {
    id: 1,
    title: "Head Wok Chef",
    department: "Kitchen",
    type: "Full-Time",
    location: "North Hobart / CBD",
    salary: "$65,000 – $80,000 + super",
    badge: "SENIOR ROLE",
    badgeColor: "bg-red-600",
    summary: "Lead our kitchen brigade across our busiest locations. You will own the wok station, set the quality standard for every dish that leaves the pass, and mentor junior kitchen staff in authentic Vietnamese cooking techniques.",
    responsibilities: [
      "Execute the full Saigon Express menu to specification, with a focus on wok-based dishes, pho, and bún bowls",
      "Maintain consistent flavour profiles across all menu items during high-volume service periods",
      "Train and supervise junior cooks and kitchen hands in Vietnamese cooking techniques",
      "Manage mise en place, prep schedules, and kitchen workflow to minimise ticket times",
      "Monitor food quality, portion control, and plate presentation standards",
      "Assist the Restaurant Manager with ordering, stock rotation, and waste reduction",
      "Uphold all food safety, hygiene, and HACCP standards at all times",
      "Contribute ideas for seasonal specials and menu development",
    ],
    requirements: [
      "Minimum 3 years' experience as a wok chef or senior cook in a Vietnamese or Asian restaurant",
      "Proven ability to work at speed and maintain quality during peak service",
      "Strong knowledge of Vietnamese flavour profiles, stocks, and sauces",
      "Food Safety Supervisor certificate (or willingness to obtain)",
      "Ability to work a rotating roster including weekends and public holidays",
      "Team leadership experience is highly regarded",
    ],
    perks: ["30% staff meal discount", "Career progression to Head Chef", "Training in our central kitchen", "Uniform provided"],
  },
  {
    id: 2,
    title: "Sous Chef",
    department: "Kitchen",
    type: "Full-Time",
    location: "Any Tasmanian Location",
    salary: "$58,000 – $68,000 + super",
    badge: null,
    badgeColor: "",
    summary: "Support the Head Chef in running a smooth, high-quality kitchen operation. You will be responsible for daily prep, service execution, and stepping up as acting Head Chef when required.",
    responsibilities: [
      "Assist the Head Chef in all aspects of kitchen management and service",
      "Lead the kitchen team during service in the Head Chef's absence",
      "Oversee daily prep lists, ensuring all stations are fully set up before service",
      "Monitor food costs, portion sizes, and wastage in line with targets",
      "Conduct daily temperature checks and food safety documentation",
      "Train new kitchen staff and provide ongoing coaching",
      "Maintain a clean, organised, and safe kitchen environment",
    ],
    requirements: [
      "2+ years' experience as a Sous Chef or Senior Cook in a fast-paced kitchen",
      "Solid understanding of Vietnamese or Asian cuisine",
      "Food Safety Supervisor certificate",
      "Strong organisational skills and ability to multitask under pressure",
      "Flexible availability including weekends",
    ],
    perks: ["30% staff meal discount", "Clear pathway to Head Chef", "Uniform provided", "Paid training"],
  },
  {
    id: 3,
    title: "Cook / Kitchen Hand",
    department: "Kitchen",
    type: "Full-Time / Part-Time",
    location: "All Locations",
    salary: "$24 – $30/hr + super",
    badge: "MULTIPLE POSITIONS",
    badgeColor: "bg-amber-600",
    summary: "Join our kitchen team and learn the craft of authentic Vietnamese cooking. Whether you are an experienced cook or an enthusiastic beginner, we will train you to the Saigon Express standard.",
    responsibilities: [
      "Prepare ingredients and complete daily mise en place tasks",
      "Assist with cooking during service under the direction of the Head Chef",
      "Maintain cleanliness and organisation of your station throughout service",
      "Complete end-of-shift cleaning duties to food safety standards",
      "Receive and store deliveries, checking quality and rotating stock",
      "Assist with dishwashing and general kitchen support as required",
    ],
    requirements: [
      "Passion for food and a willingness to learn",
      "Ability to work efficiently in a fast-paced environment",
      "Reliable, punctual, and a strong team player",
      "Food handling certificate (or willingness to obtain — we will help)",
      "Previous kitchen experience is an advantage but not essential",
    ],
    perks: ["30% staff meal discount", "Paid training", "Flexible hours", "Pathway to Cook or Sous Chef"],
  },
  {
    id: 4,
    title: "Restaurant Manager",
    department: "Management",
    type: "Full-Time",
    location: "North Hobart / CBD",
    salary: "$70,000 – $85,000 + super + bonus",
    badge: "LEADERSHIP",
    badgeColor: "bg-emerald-700",
    summary: "Take ownership of the daily operations of a Saigon Express location. You will lead a team of up to 15 staff, drive sales performance, and ensure every guest leaves with a smile.",
    responsibilities: [
      "Oversee all front-of-house and back-of-house operations for your location",
      "Recruit, onboard, roster, and manage a team of up to 15 FOH and BOH staff",
      "Drive revenue through upselling, promotions, and excellent guest experience",
      "Monitor daily sales, labour costs, and COGS against budget targets",
      "Manage stock ordering, supplier relationships, and inventory accuracy",
      "Handle guest feedback and resolve complaints professionally and promptly",
      "Ensure compliance with all food safety, liquor licensing, and OH&S regulations",
      "Prepare weekly reports for the Operations Manager and Franchise Director",
      "Champion the Saigon Express brand standards and culture at your location",
    ],
    requirements: [
      "3+ years' experience managing a restaurant, café, or QSR location",
      "Proven track record of leading and developing hospitality teams",
      "Strong financial acumen — comfortable reading P&L reports",
      "RSA certificate and Food Safety Supervisor certificate",
      "Excellent communication and conflict-resolution skills",
      "Flexible availability including weekends and public holidays",
    ],
    perks: ["Performance bonus", "30% staff meal discount", "Career path to Area Manager", "Company phone", "Paid leadership training"],
  },
  {
    id: 5,
    title: "Assistant Restaurant Manager",
    department: "Management",
    type: "Full-Time",
    location: "All Locations",
    salary: "$58,000 – $68,000 + super",
    badge: null,
    badgeColor: "",
    summary: "Support the Restaurant Manager in running a high-performing location. This is an ideal role for an experienced senior FOH team member ready to take the next step into management.",
    responsibilities: [
      "Assist the Restaurant Manager in all aspects of daily operations",
      "Supervise FOH staff during service and act as duty manager when required",
      "Open and close the venue, including cash reconciliation and end-of-day reporting",
      "Handle guest feedback and escalations with professionalism",
      "Assist with rostering, onboarding new staff, and conducting performance check-ins",
      "Monitor stock levels and assist with ordering",
      "Ensure brand standards and service procedures are followed consistently",
    ],
    requirements: [
      "2+ years' experience in a senior FOH or team leader role",
      "RSA certificate",
      "Strong leadership presence and communication skills",
      "Comfortable with POS systems and basic cash handling",
      "Flexible availability including weekends",
    ],
    perks: ["30% staff meal discount", "Clear pathway to Restaurant Manager", "Paid training", "Uniform provided"],
  },
  {
    id: 6,
    title: "Front of House (FOH) Team Leader",
    department: "Front of House",
    type: "Full-Time / Part-Time",
    location: "All Locations",
    salary: "$27 – $32/hr + super",
    badge: null,
    badgeColor: "",
    summary: "Lead the floor during service, ensuring every guest receives a warm, efficient, and memorable Saigon Express experience. You will mentor junior FOH staff and be the first point of contact for guest feedback.",
    responsibilities: [
      "Lead the FOH team during service, directing staff to tables and stations",
      "Greet and seat guests, manage waitlists, and oversee table turnover",
      "Handle guest feedback and complaints promptly and professionally",
      "Train and coach junior FOH staff in service standards and menu knowledge",
      "Assist with opening and closing duties including cash reconciliation",
      "Ensure the dining area is clean, well-presented, and fully stocked at all times",
      "Communicate clearly with the kitchen team to manage ticket flow",
    ],
    requirements: [
      "2+ years' experience in a FOH role, with at least 6 months in a team leader or senior capacity",
      "RSA certificate",
      "Excellent communication and interpersonal skills",
      "Ability to stay calm and organised during busy service periods",
      "Flexible availability including weekends and public holidays",
    ],
    perks: ["30% staff meal discount", "Pathway to Assistant Manager", "Uniform provided", "Flexible hours"],
  },
  {
    id: 7,
    title: "Talented FOH Staff / Wait Staff",
    department: "Front of House",
    type: "Full-Time / Part-Time / Casual",
    location: "All Locations",
    salary: "$24 – $28/hr + super",
    badge: "NOW HIRING",
    badgeColor: "bg-primary",
    summary: "Be the face of Saigon Express. We are always looking for warm, energetic, and guest-focused people to join our front-of-house team. No Vietnamese food experience required — just a genuine love of hospitality.",
    responsibilities: [
      "Welcome guests with warmth and enthusiasm, creating a memorable first impression",
      "Take orders accurately using our POS system and communicate special requests to the kitchen",
      "Deliver food and beverages promptly and check in on guest satisfaction",
      "Maintain a thorough knowledge of the full Saigon Express menu, including ingredients and allergens",
      "Keep the dining area clean, tidy, and well-presented throughout service",
      "Process payments and handle cash and card transactions accurately",
      "Assist with opening and closing side duties as directed",
      "Upsell menu items, drinks, and catering packages where appropriate",
    ],
    requirements: [
      "Genuine passion for hospitality and creating great guest experiences",
      "RSA certificate (or willingness to obtain — we will support you)",
      "Reliable, punctual, and a strong team player",
      "Ability to work at pace during busy service periods",
      "Previous hospitality experience is an advantage but not essential",
      "Flexible availability including weekends",
    ],
    perks: ["30% staff meal discount", "Flexible casual, part-time, or full-time hours", "Uniform provided", "Pathway to Team Leader and beyond"],
  },
  {
    id: 8,
    title: "Barista / Drinks Specialist",
    department: "Front of House",
    type: "Part-Time / Casual",
    location: "CBD / North Hobart",
    salary: "$25 – $30/hr + super",
    badge: null,
    badgeColor: "",
    summary: "Craft our Vietnamese iced coffee, homemade lemon tea, and full espresso menu for our guests. If you love coffee and Vietnamese drinks culture, this role is for you.",
    responsibilities: [
      "Prepare and serve espresso-based coffees, Vietnamese iced coffee, and homemade drinks to specification",
      "Maintain the coffee machine, grinder, and drinks station to a high standard of cleanliness",
      "Manage stock levels for coffee, milk, and drinks ingredients",
      "Assist FOH staff during busy service periods",
      "Engage with guests and share your knowledge of our drinks menu",
    ],
    requirements: [
      "Barista experience with a strong understanding of espresso technique",
      "Interest in Vietnamese drinks culture is a bonus",
      "RSA certificate",
      "Friendly, guest-focused personality",
      "Flexible availability including weekends",
    ],
    perks: ["30% staff meal discount", "Free coffee on shift", "Flexible hours", "Uniform provided"],
  },
  {
    id: 9,
    title: "Delivery & Catering Coordinator",
    department: "Operations",
    type: "Full-Time / Part-Time",
    location: "Hobart Region",
    salary: "$26 – $32/hr + super",
    badge: null,
    badgeColor: "",
    summary: "Coordinate our growing catering and delivery operations across Greater Hobart. You will be the logistics backbone of our catering business, ensuring every order arrives on time, at temperature, and presented perfectly.",
    responsibilities: [
      "Manage all catering order bookings, confirmations, and client communication",
      "Coordinate delivery schedules and driver logistics for catering and wholesale orders",
      "Pack and quality-check catering orders before dispatch",
      "Liaise with the kitchen team to ensure catering orders are prepared on time",
      "Maintain catering equipment, packaging inventory, and delivery vehicle cleanliness",
      "Handle post-event follow-up with catering clients",
      "Assist with the development of new catering packages and pricing",
    ],
    requirements: [
      "Experience in a logistics, events, or hospitality coordination role",
      "Valid Australian driver's licence",
      "Strong organisational skills and attention to detail",
      "Excellent communication skills — you will be the client's main point of contact",
      "Ability to lift and carry catering equipment (up to 15kg)",
      "Food handling certificate",
    ],
    perks: ["30% staff meal discount", "Company vehicle for deliveries", "Flexible hours", "Pathway to Operations Manager"],
  },
  {
    id: 10,
    title: "Wholesale & B2B Account Manager",
    department: "Sales & Wholesale",
    type: "Full-Time",
    location: "Hobart (Travel Required)",
    salary: "$60,000 – $72,000 + super + commission",
    badge: null,
    badgeColor: "",
    summary: "Grow our wholesale business across Tasmania. You will manage relationships with existing café, grocery, and hospitality partners, and actively prospect for new B2B accounts.",
    responsibilities: [
      "Manage and grow a portfolio of wholesale accounts across Tasmania",
      "Conduct regular client visits to ensure satisfaction and identify upsell opportunities",
      "Prospect and onboard new B2B partners including cafés, delis, and corporate clients",
      "Prepare and present wholesale proposals, pricing, and product samples",
      "Coordinate with the warehouse team to ensure accurate and timely order fulfilment",
      "Track sales performance and report weekly to the Operations Manager",
      "Represent Saigon Express at trade events, food expos, and networking functions",
    ],
    requirements: [
      "2+ years' experience in a B2B sales or account management role, preferably in food & beverage",
      "Strong relationship-building and negotiation skills",
      "Valid Australian driver's licence",
      "Self-motivated with a proven ability to hit sales targets",
      "Proficiency in CRM tools and Microsoft Office",
    ],
    perks: ["Commission structure on new accounts", "Company vehicle", "Expense account for client entertainment", "Career path to Sales Manager"],
  },
  {
    id: 11,
    title: "Marketing & Social Media Coordinator",
    department: "Marketing",
    type: "Part-Time / Full-Time",
    location: "Hobart (Hybrid)",
    salary: "$55,000 – $65,000 + super (pro-rata)",
    badge: null,
    badgeColor: "",
    summary: "Tell the Saigon Express story to Tasmania and beyond. You will manage our social media presence, create content, run promotions, and help build one of Tasmania's most loved food brands.",
    responsibilities: [
      "Plan, create, and schedule content across Instagram, Facebook, and TikTok",
      "Photograph and film food, team, and behind-the-scenes content at our locations",
      "Manage community engagement — respond to comments, DMs, and reviews",
      "Plan and execute seasonal promotions, giveaways, and influencer partnerships",
      "Write copy for the website, email newsletters, and in-store signage",
      "Monitor analytics and report on content performance monthly",
      "Assist with the design of menus, flyers, and marketing collateral",
      "Support the franchise and wholesale teams with B2B marketing materials",
    ],
    requirements: [
      "Demonstrated experience managing social media for a food, hospitality, or lifestyle brand",
      "Strong photography and basic video editing skills (Reels, TikTok)",
      "Excellent copywriting ability — warm, engaging, and on-brand",
      "Proficiency in Canva or Adobe Creative Suite",
      "Passion for Vietnamese food culture and storytelling",
      "Degree in Marketing, Communications, or a related field is advantageous",
    ],
    perks: ["Hybrid work arrangement", "30% staff meal discount", "Creative freedom to build the brand", "Career path to Marketing Manager"],
  },
  {
    id: 12,
    title: "Franchise Support Officer",
    department: "Franchise",
    type: "Full-Time",
    location: "Hobart CBD",
    salary: "$58,000 – $70,000 + super",
    badge: null,
    badgeColor: "",
    summary: "Support the growth of the Saigon Express franchise network. You will be the primary point of contact for new and existing franchisees, helping them succeed through training, compliance, and operational support.",
    responsibilities: [
      "Onboard new franchisees through the full training and set-up process",
      "Conduct regular store visits to assess compliance with brand standards and SOPs",
      "Provide ongoing operational support and troubleshooting to franchisees",
      "Maintain and update the Franchise Operations Manual and training materials",
      "Coordinate the franchise application and approval process",
      "Liaise with legal, finance, and marketing teams on behalf of franchisees",
      "Prepare monthly performance reports for each franchise location",
    ],
    requirements: [
      "Experience in franchise operations, hospitality management, or a similar field",
      "Strong interpersonal skills and ability to build trust with business owners",
      "Highly organised with excellent written and verbal communication",
      "Willingness to travel to franchise locations across Tasmania",
      "Understanding of franchise agreements and compliance frameworks is advantageous",
    ],
    perks: ["Travel allowance", "Career path to Franchise Development Manager", "Company phone and laptop", "Paid professional development"],
  },
];

const BENEFITS = [
  { icon: Star, title: "30% Staff Meal Discount", desc: "Enjoy 30% off your meal every time you work. We believe in looking after our team." },
  { icon: Zap, title: "Fast Career Progression", desc: "We promote from within. Many of our managers and team leaders started as kitchen hands or FOH staff." },
  { icon: Heart, title: "Inclusive, Supportive Culture", desc: "We celebrate diversity and welcome people from all backgrounds. Vietnamese culture is at our heart — and everyone is family." },
  { icon: Users, title: "Team Events & Recognition", desc: "Quarterly team gatherings, staff awards, and a genuine culture of appreciation for the work you do." },
  { icon: Briefcase, title: "Paid Training & Development", desc: "We invest in your growth — from food safety certificates to leadership workshops and barista training." },
  { icon: MapPin, title: "Multiple Locations Across Tasmania", desc: "With 8 locations and more planned, there are opportunities close to where you live." },
];

export default function Careers() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [filterDept, setFilterDept] = useState("All");

  const departments = ["All", ...Array.from(new Set(JOBS.map(j => j.department)))];
  const filtered = filterDept === "All" ? JOBS : JOBS.filter(j => j.department === filterDept);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top portal bar */}
      <div className="hidden lg:flex items-center justify-end gap-6 px-8 py-2 border-b border-border/40 text-xs text-muted-foreground bg-background">
        {PORTAL_LINKS.map(l => (
          <Link key={l.href} href={l.href} className="hover:text-primary transition-colors font-medium">{l.label}</Link>
        ))}
      </div>

      {/* Sticky nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <img loading="eager" src={LOGO_URL} alt="Saigon Express Tasmania" className="h-10 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`text-sm font-medium transition-colors ${l.href === "/careers" ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href="mailto:info@saigonexpress.com.au">
              <button className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-white rounded-xl px-5 py-2 hover:bg-primary/90 transition-colors">
                Apply Now <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </a>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-foreground mb-1.5" />
            <div className="w-5 h-0.5 bg-foreground mb-1.5" />
            <div className="w-5 h-0.5 bg-foreground" />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="text-sm font-medium" onClick={() => setMenuOpen(false)}>{l.label}</Link>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative h-[52vh] min-h-[400px] overflow-hidden">
        <div className="absolute inset-0 bg-black" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-block text-xs font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full mb-5 text-white border border-white/30 bg-white/10 backdrop-blur-sm">
              JOIN OUR TEAM — TASMANIA
            </div>
            <h1 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-5 leading-tight">
              Grow With<br />
              <span style={{ color: "oklch(71% 0.155 62)" }}>Saigon Express.</span>
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              We are building Tasmania's most loved Vietnamese food brand — and we want passionate, talented people to build it with us. From the kitchen to the counter, every role matters.
            </p>
            <a href="#positions">
              <button className="flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors mx-auto">
                View Open Positions <ChevronRight className="w-4 h-4" />
              </button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Why work with us */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "oklch(71% 0.155 62)" }}>WHY SAIGON EXPRESS</div>
            <h2 className="font-serif text-4xl font-bold text-foreground">More Than Just a Job</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">We are a family-owned Tasmanian business with big ambitions. When you join us, you join a team that cares about food, people, and community.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground mb-1">{b.title}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{b.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job listings */}
      <section id="positions" className="py-20 bg-[#F5F0E8]">
        <div className="container">
          <div className="text-center mb-10">
            <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "oklch(71% 0.155 62)" }}>OPEN POSITIONS</div>
            <h2 className="font-serif text-4xl font-bold text-foreground">Find Your Role</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">We have {JOBS.length} open positions across our Tasmanian locations. Click any role to read the full job description.</p>
          </div>

          {/* Department filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {departments.map(d => (
              <button key={d}
                onClick={() => setFilterDept(d)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${filterDept === d ? "bg-primary text-white shadow-md" : "bg-white text-foreground/70 border border-border hover:border-primary/40"}`}>
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {filtered.map((job, i) => (
              <motion.div key={job.id}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Job header */}
                <button
                  className="w-full text-left p-6 flex items-start justify-between gap-4"
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {job.badge && (
                        <span className={`text-xs font-bold tracking-wider px-2.5 py-0.5 rounded-full text-white ${job.badgeColor}`}>
                          {job.badge}
                        </span>
                      )}
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">{job.department}</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-foreground mb-3">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {job.type}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> {job.salary}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {expandedJob === job.id
                      ? <ChevronUp className="w-5 h-5 text-primary" />
                      : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedJob === job.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden">
                      <div className="px-6 pb-6 border-t border-border pt-5">
                        <p className="text-muted-foreground leading-relaxed mb-6">{job.summary}</p>

                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                              Key Responsibilities
                            </h4>
                            <ul className="space-y-2">
                              {job.responsibilities.map((r, ri) => (
                                <li key={ri} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                              What We're Looking For
                            </h4>
                            <ul className="space-y-2 mb-5">
                              {job.requirements.map((r, ri) => (
                                <li key={ri} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-amber-500 mt-0.5 flex-shrink-0">›</span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              Perks & Benefits
                            </h4>
                            <ul className="space-y-2">
                              {job.perks.map((p, pi) => (
                                <li key={pi} className="text-sm text-muted-foreground flex gap-2">
                                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                          <a href={`mailto:info@saigonexpress.com.au?subject=Application: ${encodeURIComponent(job.title)}&body=Hi Saigon Express Team,%0D%0A%0D%0AI am applying for the ${encodeURIComponent(job.title)} position.%0D%0A%0D%0APlease find my details below:%0D%0A%0D%0AName:%0D%0APhone:%0D%0AAvailability:%0D%0A%0D%0AThank you`}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
                            <Mail className="w-4 h-4" /> Apply for This Role
                          </a>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-4 py-2.5">
                            Send your CV and cover letter to <strong className="text-foreground ml-1">info@saigonexpress.com.au</strong>
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark section */}
      <section className="py-20 bg-[#1A1A1A] text-white">
        <div className="container text-center">
          <div className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: "oklch(71% 0.155 62)" }}>READY TO APPLY?</div>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-5">
            Your Next Career Move<br />Starts Here.
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-10">
            Send your CV and a brief cover letter to our team. Tell us which role you're applying for and why Saigon Express is the right fit for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="mailto:info@saigonexpress.com.au?subject=Job Application — Saigon Express Tasmania"
              className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-base">
              <Mail className="w-5 h-5" /> Email Your Application
            </a>
            <div className="text-white/50 text-sm">
              <div className="font-medium text-white/80">info@saigonexpress.com.au</div>
              <div className="text-xs mt-0.5">SMS enquiries: 0416 036 016</div>
            </div>
          </div>
          <p className="text-white/35 text-xs mt-8 max-w-lg mx-auto">
            Saigon Express Tasmania is an equal opportunity employer. We welcome applications from people of all backgrounds, including First Nations peoples, people with disability, and those from culturally and linguistically diverse communities.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111111] text-white pt-16 pb-8">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <img loading="lazy" src={LOGO_URL} alt="Saigon Express Tasmania" className="h-12 w-auto object-contain mb-4" />
              <p className="text-white/40 text-sm leading-relaxed">Fresh. Healthy. Vietnamese. Proudly Tasmanian.</p>
            </div>
            <div>
              <div className="text-xs font-bold tracking-[0.15em] uppercase text-white/35 mb-5">EXPLORE</div>
              <div className="space-y-3">
                {FOOTER_LINKS.explore.map(l => (
                  <Link key={l.href} href={l.href} className="block text-sm text-white/55 hover:text-white transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold tracking-[0.15em] uppercase text-white/35 mb-5">BUSINESS</div>
              <div className="space-y-3">
                {FOOTER_LINKS.business.map(l => (
                  <Link key={l.href} href={l.href} className="block text-sm text-white/55 hover:text-white transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold tracking-[0.15em] uppercase text-white/35 mb-5">GET IN TOUCH</div>
              <div className="space-y-2 text-sm text-white/55">
                <div>info@saigonexpress.com.au</div>
                <div className="text-white/35 text-xs">SMS ONLY — DO NOT CALL</div>
                <div className="flex items-center gap-1.5 mt-2"><Phone className="w-3.5 h-3.5" /> 🇦🇺 0416 036 016</div>
                <div className="flex items-center gap-1.5 mt-2"><MapPin className="w-3.5 h-3.5" /> Level 2, 86 Collins St, Hobart TAS 7000</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/30">
            <div>© {new Date().getFullYear()} Saigon Express Tasmania. TTH Enterprises Pty Ltd. ABN 60 650 289 991. All rights reserved.</div>
            <div>Wholesale Food Supply Tasmania | Bánh Mì Catering Hobart</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
