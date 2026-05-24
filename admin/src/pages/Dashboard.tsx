import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import supabase from '@/lib/supabase/client';
import { useState } from 'react';

export function Dashboard() {
  const { user } = useSupabaseAuth();
  const [error, setError] = useState('');
  const [dbData, setDbData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const fetchUserRoles = async () => {
    try {
      setError('');
      setLoadingData(true);
      const { data, error } = await supabase.from('user_roles').select('*');

      if (error) throw error;
      setDbData(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>
              Signed in as <strong>{user?.email}</strong>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* User Roles Section */}
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>
              View and manage user roles in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button onClick={fetchUserRoles} disabled={loadingData}>
              {loadingData ? 'Loading...' : 'Load User Roles'}
            </Button>

            {dbData.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        User ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbData.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {row.user_id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm">{row.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              row.role === 'admin'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {row.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {dbData.length === 0 && !loadingData && (
              <p className="text-sm text-muted-foreground">
                Click "Load User Roles" to fetch data from the database.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
