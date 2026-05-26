"use client";

import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import { LOGO_URL } from "@/lib/site-images";
import { SITE_ORIGIN } from "@/lib/site-origin";

const BENEFITS = [
  {
    icon: "🎁",
    title: "Earn Stamps Faster",
    desc: "Open the app, scan QR at the counter — stamp added in seconds. No need to search for the website.",
    href: null,
  },
  {
    icon: "⚡",
    title: "Order in One Tap",
    desc: "Menu always ready, order 3× faster than a browser.",
    href: null,
  },
  {
    icon: "🔔",
    title: "Exclusive Deals",
    desc: "Get promotions only for app users — before they run out.",
    href: "/promotions",
  },
  {
    icon: "📍",
    title: "Find Stores Offline",
    desc: "View addresses and opening hours even without internet.",
    href: null,
  },
] as const;

export default function GetApp() {
  const copySiteLink = () => {
    void navigator.clipboard.writeText(window.location.origin);
  };

  return (
    <section className="bg-black text-white py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-32 h-32 rounded-[28px] bg-white mx-auto mb-4 shadow-2xl flex items-center justify-center overflow-hidden">
          <AppImage
            src={LOGO_URL}
            alt="Saigon Express"
            width={112}
            height={112}
            priority
            className="w-28 h-28 object-contain"
          />
        </div>
        <p className="text-white/60 text-sm mb-1">Saigon Express Tasmania</p>
        <p className="text-white/60 text-xs mb-5">saigonexpress.com.au</p>
        <div className="inline-flex items-center gap-2 bg-white/20 text-white/90 text-sm px-4 py-2 rounded-full mb-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Free &bull; No App Store needed
        </div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2">
          Get the SG App
        </h2>
        <p className="text-3xl md:text-4xl font-extrabold text-yellow-400 mb-6">
          Faster. Easier. Always Ready.
        </p>
        <p className="text-white/60 text-base max-w-xl mx-auto mb-12">
          Add <strong className="text-white">Saigon Express</strong> to your home screen — no App
          Store, no storage used. Just one tap to open anytime.
        </p>

        <div className="space-y-6 text-left mb-14">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-yellow-400 font-bold mb-4">🍎 iPhone — Safari browser</p>
            <ol className="space-y-3 text-white/80 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <span>
                  Open <strong className="text-white">saigonexpress.com.au</strong> in Safari (not
                  Chrome or Firefox)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <span>
                  Tap the <strong className="text-white">Share button ↑</strong> at the bottom
                  centre of Safari (the box with an arrow pointing up)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <span>
                  Scroll down in the share sheet and tap{" "}
                  <strong className="text-white">&quot;Add to Home Screen&quot;</strong> (with a ⊕
                  icon)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-400 text-black font-bold text-xs flex items-center justify-center">
                  !
                </span>
                <span>
                  In the name field, check it says{" "}
                  <strong className="text-white">Saigon Express</strong>. If it shows something
                  else, clear it and type <strong className="text-white">Saigon Express</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">
                  ✓
                </span>
                <span>
                  Tap <strong className="text-white">Add</strong> in the top-right corner — the SG
                  icon appears on your home screen!
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-yellow-400 font-bold mb-4">🦊 iPhone — Firefox browser</p>
            <ol className="space-y-3 text-white/80 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <span>
                  Open <strong className="text-white">saigonexpress.com.au</strong> in Firefox
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <span>
                  Tap the <strong className="text-white">⋯ menu</strong> button at the bottom-right
                  of the screen
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <span>
                  Tap <strong className="text-white">Share</strong> from the menu that appears
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <span>
                  In the iOS share sheet, tap <strong className="text-white">&quot;View More&quot;</strong>{" "}
                  (bottom-right ↓ arrow), then tap{" "}
                  <strong className="text-white">&quot;Add to Home Screen&quot;</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-400 text-black font-bold text-xs flex items-center justify-center">
                  !
                </span>
                <span>
                  In the name field, check it says{" "}
                  <strong className="text-white">Saigon Express</strong>. If it shows something
                  else, clear it and type <strong className="text-white">Saigon Express</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">
                  ✓
                </span>
                <span>
                  Tap <strong className="text-white">Add</strong> in the top-right corner — the SG
                  icon appears on your home screen!
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-yellow-400 font-bold mb-4">🤖 Android — Chrome browser</p>
            <ol className="space-y-3 text-white/80 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <span>
                  Open <strong className="text-white">saigonexpress.com.au</strong> in Chrome
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <span>
                  Tap the <strong className="text-white">⋮ menu</strong> in the top-right corner of
                  Chrome
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <span>
                  Select <strong className="text-white">&quot;Add to Home Screen&quot;</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">
                  ✓
                </span>
                <span>
                  Tap <strong className="text-white">Add</strong> — the SG icon appears on your home
                  screen!
                </span>
              </li>
            </ol>
          </div>
        </div>

        <p className="text-white/60 text-sm mb-12">
          💡 Tip: <strong className="text-white/80">Safari works best on iPhone</strong> — it
          installs in 3 steps instead of 5.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {BENEFITS.map((b) => {
            const inner = (
              <div
                className={`bg-white/5 border border-white/10 rounded-2xl p-5 text-left transition-colors${b.href ? " hover:bg-white/10 cursor-pointer" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-xl mb-3">
                  {b.icon}
                </div>
                <p className="font-bold text-white text-sm mb-1">{b.title}</p>
                <p className="text-white/50 text-xs leading-relaxed">{b.desc}</p>
                {b.href && <p className="text-yellow-400 text-xs mt-2 font-semibold">View deals →</p>}
              </div>
            );
            return b.href ? (
              <Link key={b.title} href={b.href}>
                {inner}
              </Link>
            ) : (
              <div key={b.title}>{inner}</div>
            );
          })}
        </div>

        <p className="text-white/60 text-sm mb-2">Open this page on your phone to install the app.</p>
        <p className="text-white/50 text-xs mb-6">
          Works on iPhone (Safari) and Android (Chrome) &bull; No App Store needed
        </p>
        <p className="text-white/70 text-sm mb-4">📲 Share this page with friends</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={copySiteLink}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            🔗 Copy Link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Order Vietnamese food from Saigon Express Tasmania! Add it to your home screen: ${SITE_ORIGIN}`)}`}
            suppressHydrationWarning
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
