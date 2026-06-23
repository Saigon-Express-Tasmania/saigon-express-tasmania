'use client';

import { PendingPartnersList } from '@/components/partners/PendingPartnersList';
import {
  DashboardSectionCard,
  DashboardViewAllLink,
} from '@/components/dashboard/DashboardSectionCard';
import { DashboardRefreshTableButton } from '@/components/ui/refresh-table-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import { normalizePartnerPrivileges } from '@/lib/partner-privilege-form';
import { hasAnyPortalPartnerPrivilege } from '@/lib/privileges';
import {
  confirmPartnerWithPrivileges,
  DASHBOARD_PENDING_PARTNERS_LIMIT,
  fetchPendingPartners,
  partnerDisplayName,
  type PendingPartnerProfile,
} from '@/lib/partner-profiles';
import type { BusinessType } from '@/types/UserProfile';
import { UserRoundSearch } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function PendingWholesaleMembers() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [partners, setPartners] = useState<PendingPartnerProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmPromptId, setConfirmPromptId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPendingPartners({
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

  const handleConfirm = async (
    partner: PendingPartnerProfile,
    privileges: BusinessType[],
  ) => {
    const normalized = normalizePartnerPrivileges(privileges);
    if (!hasAnyPortalPartnerPrivilege(normalized)) {
      toast.error(
        'Select at least one portal privilege (wholesale, warehouse, or franchise).',
      );
      return;
    }

    setConfirmingId(partner.id);
    try {
      await confirmPartnerWithPrivileges(partner, normalized);
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
    <DashboardSectionCard
      title="Pending wholesale members"
      description="Registrations waiting for administrator confirmation."
      icon={UserRoundSearch}
      accent="blue"
      action={
        <div className="flex items-center gap-2">
          <DashboardRefreshTableButton
            onClick={() => void loadPending()}
            disabled={loading || profileLoading}
          />
          {!loading && totalCount > 0 ? (
            <DashboardViewAllLink>
              <Link to="/partners">View all</Link>
            </DashboardViewAllLink>
          ) : null}
        </div>
      }
    >
      <PendingPartnersList
        partners={partners}
        totalCount={totalCount}
        limit={DASHBOARD_PENDING_PARTNERS_LIMIT}
        loading={loading || profileLoading}
        confirmingId={confirmingId}
        confirmPromptId={confirmPromptId}
        onConfirmPromptToggle={handleConfirmPromptToggle}
        onConfirmPromptClose={() => setConfirmPromptId(null)}
        onConfirm={(partner, privileges) =>
          void handleConfirm(partner, privileges)
        }
        skeletonCount={3}
        showHeader={false}
        emptyMessage="No pending wholesale registrations."
      />
    </DashboardSectionCard>
  );
}
