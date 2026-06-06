'use client';

import { PendingPartnersList } from '@/components/partners/PendingPartnersList';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  confirmPartnerProfile,
  DASHBOARD_PENDING_PARTNERS_LIMIT,
  fetchPendingPartners,
  partnerDisplayName,
} from '@/lib/partner-profiles';
import type { UserProfile } from '@/types/UserProfile';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function PendingWholesaleMembers() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [partners, setPartners] = useState<UserProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmPromptId, setConfirmPromptId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPendingPartners({
        businessType: 'wholesale',
        limit: DASHBOARD_PENDING_PARTNERS_LIMIT,
      });
      setPartners(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load pending wholesale members.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      void loadPending();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin, loadPending]);

  const handleConfirmPromptToggle = (partnerId: string) => {
    setConfirmPromptId((current) => (current === partnerId ? null : partnerId));
  };

  const handleConfirm = async (partner: UserProfile) => {
    setConfirmingId(partner.id);
    try {
      await confirmPartnerProfile(partner);
      toast.success(`${partnerDisplayName(partner)} confirmed.`);
      await loadPending();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to confirm partner.',
      );
    } finally {
      setConfirmingId(null);
      setConfirmPromptId(null);
    }
  };

  if (!profileLoading && !isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Pending wholesale members</CardTitle>
          <CardDescription>
            Registrations waiting for administrator confirmation.
          </CardDescription>
        </div>
        {!loading && totalCount > 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/partners/wholesale">View all</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <PendingPartnersList
          partners={partners}
          totalCount={totalCount}
          limit={DASHBOARD_PENDING_PARTNERS_LIMIT}
          loading={loading || profileLoading}
          confirmingId={confirmingId}
          confirmPromptId={confirmPromptId}
          onConfirmPromptToggle={handleConfirmPromptToggle}
          onConfirmPromptClose={() => setConfirmPromptId(null)}
          onConfirm={(partner) => void handleConfirm(partner)}
          skeletonCount={3}
          showHeader={false}
          emptyMessage="No pending wholesale registrations."
        />
      </CardContent>
    </Card>
  );
}
