"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/hooks/useSupabase";
import { hasPrivilege } from "@/lib/privileges";

export function useRedirectWholesaleMembersToShop(): void {
  const router = useRouter();
  const { isSignedIn, authMetadata, isLoading } = useSupabase();

  useEffect(() => {
    if (isLoading) return;
    if (!isSignedIn) return;
    if (!hasPrivilege(authMetadata.privileges, "wholesale")) return;

    router.replace("/wholesale/shop");
  }, [authMetadata.privileges, isLoading, isSignedIn, router]);
}
