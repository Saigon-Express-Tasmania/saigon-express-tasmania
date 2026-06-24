"use client";

import {
  MEMBER_PORTAL_BACKGROUNDS,
  resolveMemberPortalBackground,
} from "@/lib/member-portal-backgrounds";
import { useEffect, useState, type ReactNode } from "react";

type MemberPortalBackgroundProps = {
  children: ReactNode;
  className?: string;
  variant?: "dark" | "light";
};

export default function MemberPortalBackground({
  children,
  className = "",
  variant = "dark",
}: MemberPortalBackgroundProps) {
  const [backgroundUrl, setBackgroundUrl] = useState<string>(
    MEMBER_PORTAL_BACKGROUNDS[0],
  );

  const isLight = variant === "light";

  useEffect(() => {
    if (isLight) return;
    setBackgroundUrl(resolveMemberPortalBackground());
  }, [isLight]);

  return (
    <div
      className={`relative isolate min-h-screen ${isLight ? "bg-[#f5f5f5] text-gray-900" : "text-white"} ${className}`.trim()}
    >
      {!isLight ? (
        <div
          className="pointer-events-none fixed left-0 top-0 z-0 h-[100dvh] w-screen max-w-[100vw] scale-105 bg-cover bg-center bg-no-repeat brightness-75 blur-xs"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundUrl})`,
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
