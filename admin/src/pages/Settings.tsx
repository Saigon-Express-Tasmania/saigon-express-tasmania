import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function Settings() {
  const [isRevalidating, setIsRevalidating] = useState(false);

  const handleRevalidateFrontend = async () => {
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL as string | undefined;
    const revalidateToken = import.meta.env.VITE_REVALIDATE_TOKEN as
      | string
      | undefined;

    if (!frontendUrl) {
      toast.error('Missing VITE_FRONTEND_URL in admin environment.');
      return;
    }

    if (!revalidateToken) {
      toast.error('Missing VITE_REVALIDATE_TOKEN in admin environment.');
      return;
    }

    setIsRevalidating(true);
    try {
      const response = await fetch(
        `${frontendUrl.replace(/\/$/, '')}/api/revalidate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-token': revalidateToken,
          },
          body: JSON.stringify({}),
        },
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to revalidate frontend cache.');
      }

      toast.success('Frontend cache revalidated.');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to revalidate frontend cache.',
      );
    } finally {
      setIsRevalidating(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage application settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Trigger on-demand cache flush on the frontend Next.js app.
          </p>
          <Button
            onClick={() => void handleRevalidateFrontend()}
            disabled={isRevalidating}
          >
            {isRevalidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revalidating...
              </>
            ) : (
              'Revalidate Frontend Cache'
            )}
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
