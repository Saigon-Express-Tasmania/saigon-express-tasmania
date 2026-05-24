"use client";

import { useState } from "react";
import { FacebookIcon, XIcon } from "@/components/icons/brand-icons";
import { Share2, MessageCircle, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { SITE_ORIGIN } from "@/lib/site-origin";

interface ShareDealButtonProps {
  title: string;
  description?: string | null;
  /** Absolute or relative URL for the deal — defaults to current page */
  url?: string;
}

export function ShareDealButton({ title, description, url }: ShareDealButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const dealUrl =
    url && url.startsWith("http")
      ? url
      : `${SITE_ORIGIN}${url ?? "/"}`;

  const encodedUrl = encodeURIComponent(dealUrl);
  const encodedText = encodeURIComponent(`${title}${description ? ` — ${description}` : ""} 🍜 Saigon Express Tasmania`);

  const channels = [
    {
      label: "Facebook",
      icon: <FacebookIcon className="w-4 h-4" />,
      color: "hover:bg-blue-600/20 hover:text-blue-400",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "X (Twitter)",
      icon: <XIcon className="w-4 h-4" />,
      color: "hover:bg-sky-500/20 hover:text-sky-400",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle className="w-4 h-4" />,
      color: "hover:bg-green-600/20 hover:text-green-400",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dealUrl);
      setCopied(true);
      setOpen(false);
      toast.success("Link copied!", { description: "Share it anywhere you like." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleChannel = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent gap-1.5 text-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share this deal
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-2 bg-[#2a0808] border border-white/10 shadow-xl"
        align="start"
        sideOffset={6}
      >
        <p className="text-white/40 text-[10px] uppercase tracking-widest px-2 pb-1.5 font-semibold">
          Share via
        </p>
        <div className="space-y-0.5">
          {channels.map((ch) => (
            <button
              key={ch.label}
              onClick={() => handleChannel(ch.href)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/70 text-sm transition-colors ${ch.color}`}
            >
              {ch.icon}
              {ch.label}
            </button>
          ))}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/70 text-sm transition-colors hover:bg-white/10 hover:text-white"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
