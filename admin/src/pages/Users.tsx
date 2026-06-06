import { DashboardLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUserProfile } from '@/hooks/useUserProfile';
import supabase from '@/lib/supabase/client';
import type { BusinessType, UserProfile } from '@/types/UserProfile';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type MemberProfile = Pick<
  UserProfile,
  | 'id'
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'display_name'
  | 'business_name'
  | 'abn'
  | 'business_category'
  | 'business_type'
  | 'phone'
  | 'address_line1'
  | 'is_verified'
  | 'created_at'
>;

const MEMBER_SELECT =
  'id, email, first_name, last_name, display_name, business_name, abn, business_category, business_type, phone, address_line1, is_verified, created_at';

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  personal: 'Personal',
  wholesale: 'Wholesale',
  warehouse: 'Warehouse',
  franchise: 'Franchise',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function memberName(profile: MemberProfile): string {
  return (
    profile.display_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
    profile.email ||
    'Unknown'
  );
}

export function Users() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [pendingMembers, setPendingMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadPendingMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(MEMBER_SELECT)
        .in('business_type', ['wholesale', 'warehouse'])
        .eq('is_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingMembers((data as MemberProfile[] | null) ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load pending registrations.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      void loadPendingMembers();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin, loadPendingMembers]);

  const handleConfirm = async (member: MemberProfile) => {
    setConfirmingId(member.id);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_verified: true })
        .eq('id', member.id);

      if (error) throw error;

      setPendingMembers((current) => current.filter((row) => row.id !== member.id));
      toast.success(`${memberName(member)} confirmed.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to confirm registration.';
      toast.error(message);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <DashboardLayout title="Users">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Pending member confirmations</CardTitle>
            <CardDescription>
              Confirm wholesale and warehouse registrations. No confirmation email
              is sent — members can sign in once you confirm their account.
            </CardDescription>
          </div>
          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadPendingMembers()}
              disabled={loading}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {profileLoading || loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading registrations…
            </div>
          ) : !isAdmin ? (
            <p className="text-muted-foreground">
              Administrator access is required to confirm member registrations.
            </p>
          ) : pendingMembers.length === 0 ? (
            <p className="text-muted-foreground">No pending confirmations.</p>
          ) : (
            <div className="space-y-4">
              {pendingMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border p-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{memberName(member)}</p>
                      <Badge variant="secondary">
                        {BUSINESS_TYPE_LABELS[member.business_type]}
                      </Badge>
                      <Badge variant="outline">Pending confirmation</Badge>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground">
                      <p>
                        <span className="text-foreground">Email:</span>{' '}
                        {member.email ?? '—'}
                      </p>
                      <p>
                        <span className="text-foreground">Business:</span>{' '}
                        {member.business_name ?? '—'}
                      </p>
                      {member.abn ? (
                        <p>
                          <span className="text-foreground">ABN:</span> {member.abn}
                        </p>
                      ) : null}
                      {member.business_category ? (
                        <p>
                          <span className="text-foreground">Category:</span>{' '}
                          {member.business_category}
                        </p>
                      ) : null}
                      {member.phone ? (
                        <p>
                          <span className="text-foreground">Phone:</span>{' '}
                          {member.phone}
                        </p>
                      ) : null}
                      {member.address_line1 ? (
                        <p>
                          <span className="text-foreground">Address:</span>{' '}
                          {member.address_line1}
                        </p>
                      ) : null}
                      <p>
                        <span className="text-foreground">Submitted:</span>{' '}
                        {formatDate(member.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleConfirm(member)}
                    disabled={confirmingId === member.id}
                    className="shrink-0"
                  >
                    {confirmingId === member.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Confirming…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
