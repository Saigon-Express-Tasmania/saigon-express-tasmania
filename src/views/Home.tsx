import AppImage from '@/components/AppImage';
import LazyImage from '@/components/LazyImage';
import Link from '@/components/link';
import MainHeader, { PORTAL_LINKS } from '@/components/MainHeader';
import dynamic from 'next/dynamic';
import type { MenuItem } from '@/contexts/CartContext';
import type { FeaturedReview } from '@/types';
import { LOGO_URL } from '@/lib/site-images';
import { FacebookIcon, InstagramIcon } from '@/components/icons/brand-icons';
import { ChevronRight, MapPin, ShoppingCart } from 'lucide-react';

const GetApp = dynamic(() => import('@/components/GetApp'));
const Newsletter = dynamic(() => import('@/components/Newsletter'));
const ReviewsSection = dynamic(() => import('@/components/ReviewsSection'));

// ── Uploaded food photography ─────────────────────────────────────────────────
const IMGS = {
   videoCover: '/manus-storage/saigo_express__video_cover.webp',
   ourFood: '/manus-storage/saigo_express__hero_Native_5d9afb69.webp',
   ourFood2a: '/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg',
   ourFood2b: '/manus-storage/saigo_express__Combination_beef_noodle_soup_pho_NativeLarge_30ae4434.png',
   ourFood2c: '/manus-storage/_Q7A0084addedcontrastandsat_4c8d6b63.jpg',
   ourFood2d: '/manus-storage/saigo_express__Cuon_Vietnamese_prawn_rice_paper_rolls_NativeLarge_d710816c.png',
   ourFood2e: '/manus-storage/saigo_express__Vietnamese_rice_noodle_salad_bun_NativeLarge_724e0124.png',
   ourFood2f: '/manus-storage/saigo_express__Viet_rice_Grilled_pork_and_fried_egg_rice_Native_fc6d43db.jpg',
   catering: '/manus-storage/catering-hero-counter_71eb7271.jpg',
   cateringBox: '/manus-storage/SaigonFeastBox_6c26a5d8.jpg',
   signature: '/manus-storage/banh-mi-3_465cb7d1.jpg',
   cat1: '/manus-storage/banh-mi-2_7d02846f.jpg',
   cat2: '/manus-storage/pho-2_4fc44f9f.jpg',
   cat3: '/manus-storage/spring-rolls-1_02f22814.jpg',
   wholesale: '/manus-storage/wholesale-restaurant-counter_2d79d665.jpg',
   news1: '/manus-storage/news-story-began_47dbdf79.jpg',
   news2: '/manus-storage/news-team-behind_03530abb.jpg',
   news3: '/manus-storage/sorell_store_food_36779d67.jpg',
};

const MARQUEE_ITEMS = [
   'VIETNAMESE BAGUETTE',
   'BEEF PHO',
   'HUE NOODLE SOUP',
   'FRESH RICE PAPER ROLLS',
   'BROKEN RICE',
   'CRISPY PANCAKE',
   'STIR FRIED NOODLES',
   'FRIED RICE',
   'CRISPY FRIED CHICKEN',
   'CATERING BOXES',
];

const NEWS = [
   {
      date: '1 Jun 2016',
      tag: 'OUR STORY',
      title: 'How It All Began: Opening Our First Store at 335 Elizabeth St, North Hobart',
      img: IMGS.news1,
      excerpt:
         'In 2016, Dr. Tien had one dream — to bring the authentic flavours of Vietnamese street food to Tasmania. Starting from a small shopfront at 335 Elizabeth Street, North Hobart, he wanted every Hobartian to experience the warmth of Vietnamese culture through fresh, healthy, and affordable food. That first store became the heart of what Saigon Express is today.',
   },
   {
      date: '15 Mar 2024',
      tag: 'TEAM',
      title: 'The People Behind Every Bowl: Meet the Saigon Express Family',
      img: IMGS.news2,
      excerpt:
         'Behind every steaming bowl of pho and every freshly baked bánh mì is a dedicated team who treat every customer like family. Our staff bring passion, culture, and care to every single dish — every single day.',
   },
   {
      date: '10 Apr 2025',
      tag: 'NEW STORE',
      title: 'Saigon Express Sorell — Our 8th Store Is Now Open!',
      img: IMGS.news3,
      excerpt:
         "We're thrilled to announce the opening of Saigon Express Sorell, our 8th store in Tasmania! Bringing fresh, healthy Vietnamese food to the Sorell community — because great food should be accessible to everyone across the island.",
   },
];

type HomeProps = {
   menuItems: MenuItem[];
   featuredReviews: FeaturedReview[];
};

export default function Home({ menuItems, featuredReviews }: HomeProps) {
   const bestSellers = menuItems.filter((m) => Boolean(m.isAvailable) && Boolean(m.isPopular)).slice(0, 4);

   return (
      <div className="min-h-screen bg-brand-cream text-brand-dark">
         {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
         <div className="topbar">
            <div className="max-w-[1280px] mx-auto px-4 h-9 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
                  {PORTAL_LINKS.map((p) => (
                     <Link
                        key={p.href}
                        href={p.href}
                        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors whitespace-nowrap text-xs font-medium"
                     >
                        <span>{p.icon}</span>
                        {p.label}
                     </Link>
                  ))}
               </div>
               <div className="hidden sm:flex items-center gap-4 text-white/60 text-xs">
                  <a href="tel:0416036016" className="hover:text-white transition-colors">
                     0416 036 016
                  </a>
                  <span>·</span>
                  <a href="mailto:info@saigonexpress.com.au" className="hover:text-white transition-colors">
                     info@saigonexpress.com.au
                  </a>
               </div>
            </div>
         </div>

         <MainHeader />

         {/* ── HERO ────────────────────────────────────────────────────────── */}
         <section className="relative h-[88vh] min-h-[560px] overflow-hidden">
            {/* Background video — autoplay, muted, loop, like destinationroll.co */}
            <video
               autoPlay
               muted
               loop
               playsInline
               className="absolute inset-0 w-full h-full object-cover"
               poster={IMGS.videoCover}
            >
               <source src="/manus-storage/BanhMi_web_03ab6374.mp4" type="video/mp4" />
               {/* <source src="/manus-storage/BanhMi2_web_074b8341.mp4" type="video/mp4" /> */}
            </video>
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

            <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 md:px-12 lg:px-20 max-w-[1280px] mx-auto">
               <span className="inline-block mb-4 text-xs font-bold tracking-[0.18em] uppercase text-white bg-brand-red px-3 py-1.5 rounded-sm w-fit">
                  MADE FRESH DAILY · TASMANIA
               </span>
               <h1 className="font-serif text-white text-5xl md:text-6xl lg:text-7xl leading-[1.05] max-w-2xl mb-5">
                  Authentic Vietnamese.
                  <br />
                  <span className="italic">Every Single Day.</span>
               </h1>
               <p className="text-white/75 text-base md:text-lg max-w-lg mb-8 font-sans font-light">
                  Tasmania's home for fresh bánh mì, pho, bún bowls, and Vietnamese street food — crafted from scratch
                  at 8 locations across the island.
               </p>
               <div className="flex flex-wrap gap-3">
                  <Link href="/menu" className="btn-red">
                     <ShoppingCart size={16} /> Order Online
                  </Link>
                  <Link href="/catering" className="btn-outline-white">
                     🍱 Catering
                  </Link>
                  <Link href="/stores" className="btn-outline-white">
                     <MapPin size={16} /> Find Us
                  </Link>
               </div>
            </div>
         </section>

         {/* ── MARQUEE TICKER ──────────────────────────────────────────────── */}
         <div className="bg-brand-red py-3 overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
               {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                  <span
                     key={i}
                     className="flex items-center gap-3 mx-4 text-white text-sm font-semibold tracking-wider uppercase"
                  >
                     {item}
                     <span className="text-white/40">✦</span>
                  </span>
               ))}
            </div>
         </div>

         {/* ── OUR FOOD — asymmetric split ─────────────────────────────────── */}
         <section
            className="py-20 lg:py-28 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #2d0f00 40%, #1a0a00 100%)' }}
         >
            {/* Subtle texture overlay */}
            <div
               className="absolute inset-0 opacity-10"
               style={{
                  backgroundImage:
                     'radial-gradient(circle at 20% 50%, #c8102e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c8102e 0%, transparent 40%)',
               }}
            />

            {/* Section header — full width above the split */}
            <div className="max-w-[1280px] mx-auto px-4 mb-12 reveal">
               <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-brand-red/80 mb-3">
                  OUR FOOD
               </span>
               <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white leading-tight">
                  Lighten Up Your Lunch.
                  <br />
                  <span className="text-brand-red italic">Fresh Vietnamese.</span>
               </h2>
            </div>

            <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-[3fr_2fr] gap-8 items-center">
               {/* Large image left */}
               <div className="relative overflow-hidden rounded-sm reveal shadow-2xl">
                  <div
                     className="relative w-full h-[520px]"
                     style={{
                        aspectRatio: '64/51',
                     }}
                  >
                     <AppImage src={IMGS.ourFood} alt="Our Vietnamese food" fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm rounded-sm px-4 py-3 shadow-lg">
                     <p className="text-xs font-bold tracking-widest uppercase text-brand-red mb-0.5">
                        HANDCRAFTED DAILY
                     </p>
                     <p className="text-sm font-medium text-brand-dark">Every dish made with care, every time.</p>
                  </div>
               </div>

               {/* Text right */}
               <div className="reveal" style={{ animationDelay: '0.15s' }}>
                  <p className="text-white/70 text-base leading-relaxed mb-6">
                     Fresh Vietnamese food perfect for meetings, gatherings, and everyday meals. Our bánh mì are baked
                     fresh throughout the day — crispy baguette, house-made pâté, and vibrant fillings that keep you
                     coming back.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-8">
                     {['Bánh Mì', 'Pho', 'Bún Bowls', 'Spring Rolls', 'Rice Paper Rolls', 'Broken Rice'].map((tag) => (
                        <span
                           key={tag}
                           className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase text-white border border-white/20 bg-white/10"
                        >
                           {tag}
                        </span>
                     ))}
                  </div>
                  <Link href="/menu" className="btn-red">
                     Want to Try Our Food? <ChevronRight size={16} />
                  </Link>
               </div>
            </div>

            {/* 6-photo mosaic grid */}
            <div className="max-w-[1280px] mx-auto px-4 mt-10 grid grid-cols-2 md:grid-cols-3 gap-3 reveal">
               {[IMGS.ourFood2a, IMGS.ourFood2b, IMGS.ourFood2c, IMGS.ourFood2d, IMGS.ourFood2e, IMGS.ourFood2f].map(
                  (src, i) => (
                     <div key={i} className="overflow-hidden rounded-sm aspect-[4/3]">
                        <LazyImage
                           src={src}
                           alt="Saigon Express food"
                           wrapperClassName="w-full h-full"
                           className="hover:scale-105 transition-transform duration-500"
                        />
                     </div>
                  ),
               )}
            </div>
         </section>

         {/* ── CATERING — asymmetric split ─────────────────────────────────── */}
         <section className="py-20 lg:py-28 bg-white">
            <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
               {/* Image left */}
               <div className="relative reveal">
                  <div className="relative w-full h-[480px] rounded-sm overflow-hidden">
                     <AppImage
                        src={IMGS.catering}
                        alt="Saigon Express catering"
                        fill
                        className="object-cover rounded-sm"
                     />
                  </div>
                  {/* Floating card */}
                  <div className="absolute bottom-6 right-6 bg-white rounded-sm shadow-xl p-4 max-w-[180px]">
                     <AppImage
                        src={IMGS.cateringBox}
                        alt="Catering box"
                        width={320}
                        height={96}
                        className="w-full h-24 object-cover rounded-sm mb-2"
                     />
                     <p className="text-xs font-bold text-brand-dark">Mixed Catering Box</p>
                     <p className="text-xs text-brand-dark/60">Bánh Mì + Spring Rolls</p>
                  </div>
               </div>

               {/* Text right */}
               <div className="reveal" style={{ animationDelay: '0.15s' }}>
                  <span className="section-label">CATERING</span>
                  <h2 className="font-serif text-4xl md:text-5xl text-brand-dark mt-3 mb-5">
                     Feed the Whole Crew.
                     <br />
                     <span className="text-brand-red italic">We've Got You Covered.</span>
                  </h2>
                  <p className="text-brand-dark/70 text-base leading-relaxed mb-6">
                     From office lunches to large events — our catering boxes are packed fresh with bánh mì, spring
                     rolls, and more. Minimum 10 rolls, delivered or pick-up. Available across Tasmania.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-8">
                     {['Office Catering', 'Events & Parties', 'Corporate Orders', 'Same-Day Available'].map((tag) => (
                        <span key={tag} className="pill-tag">
                           {tag}
                        </span>
                     ))}
                  </div>
                  <Link href="/catering" className="btn-red">
                     Order Catering <ChevronRight size={16} />
                  </Link>
               </div>
            </div>
         </section>

         {/* ── SIGNATURE — full-bleed dark ─────────────────────────────────── */}
         <section className="relative py-28 overflow-hidden">
            <AppImage
               src="/manus-storage/IMG_4152Large_d9da7044.png"
               alt="Saigon Express food spread"
               fill
               className="object-cover"
            />
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative z-10 max-w-[1280px] mx-auto px-4 text-center">
               <span className="section-label text-white/60 mb-4 block">SIGNATURE</span>
               <h2 className="font-serif text-white text-5xl md:text-6xl lg:text-7xl mb-5">
                  The Original.
                  <br />
                  <span className="italic">The Iconic.</span>
               </h2>
               <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
                  This is what bánh mì is meant to taste like.
               </p>
               <Link href="/menu" className="btn-outline-white">
                  See Our Menu <ChevronRight size={16} />
               </Link>
            </div>
         </section>

         {/* ── SOMETHING FOR EVERYONE — 3-col category grid ────────────────── */}
         <section className="py-20 lg:py-28 bg-brand-cream">
            <div className="max-w-[1280px] mx-auto px-4">
               <div className="text-center mb-12 reveal">
                  <span className="section-label">MORE THAN BÁNH MÌ</span>
                  <h2 className="font-serif text-4xl md:text-5xl text-brand-dark mt-3">Something for Everyone</h2>
               </div>
               <div className="grid md:grid-cols-3 gap-6">
                  {[
                     {
                        img: '/manus-storage/hero-stir-fried-noodles_84d4beca.jpg',
                        title: 'Stir Fry Noodles',
                        desc: 'Wok-tossed over high flame until perfectly charred — silky egg noodles with your choice of beef, chicken, prawn or tofu, tossed with fresh vegetables in our signature savoury sauce. Every plate is made to order, every time.',
                     },
                     {
                        img: '/manus-storage/saigo_express__Hot_plate_chicken_lemongrass_and_chilli_NativeLarge_421583fc.png',
                        title: 'Hot Plate',
                        desc: 'Sizzling on a scorching iron plate — tender chicken stir-fried with fresh lemongrass, chilli, capsicum and fragrant herbs in a bold Vietnamese sauce. The aroma hits before it even reaches your table. A Saigon Express signature.',
                     },
                     {
                        img: '/manus-storage/saigo_express__Roasted_pork_and_roasted_duck_NativeLarge_aff2e8e9.png',
                        title: 'Crackling Pork & Roast Duck',
                        desc: "Two of Vietnam's most celebrated roasts on one plate. Crispy crackling pork belly with shatteringly crunchy skin alongside golden roast duck — both slow-roasted in-house and served with pickled vegetables and our house-made soy dipping sauce.",
                     },
                  ].map((cat, i) => (
                     <Link
                        key={i}
                        href="/menu"
                        className="group block overflow-hidden rounded-sm card-lift reveal"
                        style={{ animationDelay: `${i * 0.1}s` }}
                     >
                        <div className="overflow-hidden aspect-[4/3]">
                           <LazyImage
                              src={cat.img}
                              alt={cat.title}
                              wrapperClassName="w-full h-full"
                              className="group-hover:scale-105 transition-transform duration-500"
                           />
                        </div>
                        <div className="pt-4 pb-2">
                           <h3 className="font-serif text-xl text-brand-dark mb-1">{cat.title}</h3>
                           <p className="text-sm text-brand-dark/60 leading-relaxed">{cat.desc}</p>
                        </div>
                     </Link>
                  ))}
               </div>
            </div>
         </section>

         {/* ── BEST SELLERS — 4-col product grid ───────────────────────────── */}
         {bestSellers.length > 0 && (
            <section className="py-20 bg-white">
               <div className="max-w-[1280px] mx-auto px-4">
                  <div className="flex items-end justify-between mb-10 reveal">
                     <div>
                        <span className="section-label">CUSTOMER FAVOURITES</span>
                        <h2 className="font-serif text-4xl text-brand-dark mt-2">Best Sellers</h2>
                     </div>
                     <Link
                        href="/menu"
                        className="text-sm font-semibold text-brand-red hover:underline flex items-center gap-1"
                     >
                        See Full Menu <ChevronRight size={14} />
                     </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                     {bestSellers.map((item, i) => (
                        <Link
                           key={item.id}
                           href="/menu"
                           className="group block bg-brand-cream rounded-sm overflow-hidden card-lift reveal"
                           style={{ animationDelay: `${i * 0.08}s` }}
                        >
                           <div className="aspect-square overflow-hidden bg-gray-100">
                              <LazyImage
                                 src={item.imageUrl ?? [IMGS.cat1, IMGS.cat2, IMGS.cat3, IMGS.ourFood2a][i % 4]}
                                 alt={item.name}
                                 wrapperClassName="w-full h-full"
                                 className="group-hover:scale-105 transition-transform duration-500"
                              />
                           </div>
                           <div className="p-4">
                              <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-1">
                                 {item.category}
                              </p>
                              <h3 className="font-serif text-lg text-brand-dark leading-tight mb-1">{item.name}</h3>
                              <p className="text-sm text-brand-dark/60 line-clamp-2 mb-3">{item.description}</p>
                              <div className="flex items-center justify-between">
                                 <span className="font-bold text-brand-dark">${Number(item.price).toFixed(2)}</span>
                                 <span className="text-xs text-brand-red font-semibold">Order →</span>
                              </div>
                           </div>
                        </Link>
                     ))}
                  </div>
               </div>
            </section>
         )}

         {/* ── WHOLESALE — dark charcoal split ─────────────────────────────── */}
         <section className="bg-brand-dark py-20 lg:py-28">
            <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
               <div className="reveal">
                  <div className="relative w-full h-[400px] rounded-sm overflow-hidden">
                     <AppImage src={IMGS.wholesale} alt="Wholesale supply" fill className="object-cover rounded-sm" />
                  </div>
               </div>
               <div className="reveal" style={{ animationDelay: '0.15s' }}>
                  <span className="section-label text-white/50">WHOLESALE</span>
                  <h2 className="font-serif text-white text-4xl md:text-5xl mt-3 mb-5">
                     Supply Your Café
                     <br />
                     <span className="text-brand-red italic">or Restaurant.</span>
                  </h2>
                  <p className="text-white/65 text-base leading-relaxed mb-6">
                     Partner with Saigon Express Tasmania for wholesale Vietnamese food supply across the island. Bulk
                     pricing, consistent quality, and reliable weekly delivery for cafés, grocery stores, and food
                     service businesses.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-8">
                     {['Bulk Pricing', 'Weekly Delivery', 'Consistent Quality', 'Tasmanian Business'].map((tag) => (
                        <span
                           key={tag}
                           className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/20 text-white/70 text-xs font-medium"
                        >
                           {tag}
                        </span>
                     ))}
                  </div>
                  <Link href="/wholesale-shop" className="btn-red">
                     Wholesale Shop <ChevronRight size={16} />
                  </Link>
               </div>
            </div>
         </section>

         {/* ── GET THE APP ─────────────────────────────────────────────────── */}
         <section className="py-16 bg-brand-cream border-b border-gray-100">
            <div className="max-w-[1280px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 reveal">
               <div>
                  <span className="section-label">QUICK ACCESS</span>
                  <h2 className="font-serif text-3xl text-brand-dark mt-2">Add to Your Home Screen</h2>
                  <p className="text-brand-dark/60 text-sm mt-2">
                     Get instant access to our menu, store finder, and order online — right from your phone.
                  </p>
               </div>
               <Link href="/get-the-app" className="btn-red flex-shrink-0">
                  📱 Get the App — Free <ChevronRight size={16} />
               </Link>
            </div>
         </section>

         {/* ── NEWS ────────────────────────────────────────────────────────── */}
         <section className="py-20 lg:py-28 bg-white">
            <div className="max-w-[1280px] mx-auto px-4">
               <div className="flex items-end justify-between mb-10 reveal">
                  <div>
                     <span className="section-label">LATEST FROM US</span>
                     <h2 className="font-serif text-4xl text-brand-dark mt-2">News & Updates</h2>
                  </div>
                  <button className="text-sm font-semibold text-brand-red hover:underline flex items-center gap-1">
                     View all <ChevronRight size={14} />
                  </button>
               </div>
               <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {NEWS.map((n, i) => (
                     <article
                        key={i}
                        className="group block overflow-hidden rounded-sm card-lift reveal"
                        style={{ animationDelay: `${i * 0.08}s` }}
                     >
                        <div className="overflow-hidden aspect-[4/3]">
                           <LazyImage
                              src={n.img}
                              alt={n.title}
                              wrapperClassName="w-full h-full"
                              className="group-hover:scale-105 transition-transform duration-500"
                           />
                        </div>
                        <div className="pt-4 pb-2">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="news-badge">{n.tag}</span>
                              <span className="text-xs text-brand-dark/40">{n.date}</span>
                           </div>
                           <h3 className="font-serif text-base text-brand-dark leading-snug mb-2">{n.title}</h3>
                           <p className="text-xs text-brand-dark/60 leading-relaxed line-clamp-3">{n.excerpt}</p>
                        </div>
                     </article>
                  ))}
               </div>
            </div>
         </section>

         {/* ── BECOME A PARTNER CTA ────────────────────────────────────────── */}
         <section className="py-16 bg-brand-red">
            <div className="max-w-[1280px] mx-auto px-4 text-center reveal">
               <h2 className="font-serif text-white text-4xl md:text-5xl mb-4">🤝 Become a Partner</h2>
               <p className="text-white/80 text-base max-w-xl mx-auto mb-8">
                  Join our growing network of wholesale partners, franchise owners, and catering clients across
                  Tasmania.
               </p>
               <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/wholesale-shop" className="btn-outline-white">
                     Wholesale Partner
                  </Link>
                  <Link href="/franchise" className="btn-outline-white">
                     Franchise Opportunity
                  </Link>
                  <Link href="/catering" className="btn-outline-white">
                     Catering Partner
                  </Link>
               </div>
            </div>
         </section>

         <GetApp />

         {/* ── CUSTOMER REVIEWS ────────────────────────────────────────────── */}
         <ReviewsSection reviews={featuredReviews} />

         {/* ── FOOTER ──────────────────────────────────────────────────────── */}
         <footer className="bg-brand-dark text-white/70">
            <div className="max-w-[1280px] mx-auto px-4 pt-16 pb-8">
               <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12">
                  {/* Brand col */}
                  <div>
                     <AppImage
                        src={LOGO_URL}
                        alt="Saigon Express Tasmania"
                        width={200}
                        height={48}
                        className="h-12 w-auto object-contain mb-5"
                     />
                     <p className="text-sm leading-relaxed text-white/55 mb-5 max-w-xs">
                        Fresh — Healthy — Vietnamese. Tasmania's home for authentic Vietnamese street food since 2016.
                     </p>
                     <div className="flex gap-3">
                        <a
                           href="https://facebook.com"
                           target="_blank"
                           rel="noreferrer"
                           aria-label="Facebook"
                           className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-colors"
                        >
                           <FacebookIcon size={15} />
                        </a>
                        <a
                           href="https://instagram.com"
                           target="_blank"
                           rel="noreferrer"
                           aria-label="Instagram"
                           className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-colors"
                        >
                           <InstagramIcon size={15} />
                        </a>
                     </div>
                  </div>

                  {/* Quick links */}
                  <div>
                     <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Quick Links</h3>
                     <ul className="space-y-2.5 text-sm">
                        {[
                           { href: '/menu', label: 'Our Food' },
                           { href: '/our-story', label: 'Our Story' },
                           { href: '/catering', label: 'Catering' },
                           { href: '/wholesale-shop', label: 'Wholesale Shop' },
                           { href: '/franchise', label: 'Franchise' },
                           { href: '/careers', label: 'Careers' },
                           { href: '/faq', label: 'FAQ' },
                        ].map((l) => (
                           <li key={l.href}>
                              <Link href={l.href} className="hover:text-white transition-colors">
                                 {l.label}
                              </Link>
                           </li>
                        ))}
                     </ul>
                  </div>

                  {/* Portals */}
                  <div>
                     <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Portals</h3>
                     <ul className="space-y-2.5 text-sm">
                        {PORTAL_LINKS.map((p) => (
                           <li key={p.href}>
                              <Link href={p.href} className="hover:text-white transition-colors">
                                 {p.label}
                              </Link>
                           </li>
                        ))}
                        <li>
                           <Link href="/admin" className="hover:text-white transition-colors">
                              Admin Dashboard
                           </Link>
                        </li>
                        <li>
                           <Link href="/get-the-app" className="hover:text-white transition-colors">
                              Get the App
                           </Link>
                        </li>
                     </ul>
                  </div>

                  <Newsletter />
               </div>

               {/* Bottom bar */}
               <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/60">
                  <p>
                     © {new Date().getFullYear()} Saigon Express Franchise Management / TTH Enterprises Pty Ltd · ABN 60
                     650 289 991
                  </p>
                  <div className="flex gap-4">
                     <a href="/stores" className="hover:text-white transition-colors">
                        Find a Store
                     </a>
                     <a href="/careers" className="hover:text-white transition-colors">
                        Careers
                     </a>
                     <a href="/faq" className="hover:text-white transition-colors">
                        FAQ
                     </a>
                  </div>
               </div>
            </div>
         </footer>
      </div>
   );
}
