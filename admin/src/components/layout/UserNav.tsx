import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ENV } from '@/constants';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { fetchSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { revalidateFrontendCache } from '@/pages/Settings/tools';
import { CloudUpload, Loader2, LogOut, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function UserNav() {
  const { user, signOut } = useSupabaseAuth();
  const { profile, avatarPreviewUrl } = useUserProfile();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  const handleSyncWithWebsite = async () => {
    setIsSyncing(true);
    try {
      const settings = await fetchSettings();
      const siteUrlRow = settings.find(
        (row) => row.key.trim().toLowerCase() === 'site_url',
      );
      const frontendUrl = siteUrlRow?.value?.trim() ?? '';

      await revalidateFrontendCache({
        frontendUrl,
        revalidateToken: ENV.cacheRevalidateSecret ?? '',
      });
      toast.success('Website synced.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to sync with the website.';
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const getInitials = (label: string) => {
    return label
      .split(/[\s.@]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    if (profile?.display_name?.trim()) {
      return profile.display_name.trim();
    }
    const fromParts = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fromParts) return fromParts;
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name as string;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const initialsSource =
    profile?.display_name ||
    profile?.email ||
    user?.email ||
    'User';

  return (
    <div className="flex items-center gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'relative h-10 w-10 overflow-hidden rounded-full border-0 p-0 shadow-md transition-all duration-200',
              'bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white',
              'ring-2 ring-sky-400/35 ring-offset-2 ring-offset-background',
              'hover:scale-105 hover:from-sky-600 hover:via-cyan-600 hover:to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30',
              'active:scale-95',
              'disabled:pointer-events-none disabled:opacity-80 disabled:hover:scale-100',
              !isSyncing &&
                'before:absolute before:inset-0 before:rounded-full before:bg-white/20 before:opacity-0 before:transition-opacity hover:before:opacity-100',
            )}
            aria-label="Sync with Website"
            disabled={isSyncing}
            onClick={() => void handleSyncWithWebsite()}
          >
            <span className="relative z-10 flex items-center justify-center">
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 drop-shadow-sm" />
              )}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-56">
          <div className="space-y-1">
            <p className="font-medium">Sync with Website</p>
            <p className="text-background/80 leading-snug">
              Revalidate the frontend cache so visitors see your latest changes.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full p-0"
            aria-label="User menu"
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">
                  {getInitials(initialsSource)}
                </span>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{getUserDisplayName()}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.email ?? user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
