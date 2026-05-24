import { DashboardLayout } from '@/components/layout';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export function Users() {
  return (
    <DashboardLayout title="Users">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            User management page coming soon...
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
