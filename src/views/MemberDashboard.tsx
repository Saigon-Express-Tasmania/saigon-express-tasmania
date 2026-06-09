"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MemberHeader from "@/components/MemberHeader";
import { useSupabase } from "@/hooks/useSupabase";
import { hasPortalPrivilege, resolvePortalType } from "@/lib/privileges";
import type { UserProfile } from "@/types";
import { toast } from "sonner";

function getDisplayName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

export default function MemberDashboard({ locale: _locale }: { locale: string }) {
  const router = useRouter();
  const { profile, authMetadata, isLoading, isSignedIn, signOut } = useSupabase();

  const me = useMemo(() => {
    if (!profile) return null;
    const portalType = hasPortalPrivilege(authMetadata.privileges)
      ? resolvePortalType(authMetadata.privileges)
      : "personal";

    return {
      businessName: profile.business_name?.trim() || getDisplayName(profile),
      portalType,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.push("/member");
    }
  }, [isLoading, isSignedIn, router]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  if (isLoading || !me) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading your account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
        showCart={hasPortalPrivilege(authMetadata.privileges)}
      />

      <div className="container py-10">
        <h1 className="font-serif text-2xl font-bold text-white">
          Welcome, {getDisplayName(profile!)}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Your member dashboard. Portal features appear here once an administrator
          grants access.
        </p>
      </div>
    </div>
  );
}
