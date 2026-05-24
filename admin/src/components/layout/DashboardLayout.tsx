import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { UserNav } from './UserNav';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  headerContent?: ReactNode;
}

export function DashboardLayout({
  children,
  title,
  headerContent,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-4">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            )}
          </div>

          <div className="flex flex-1 items-center justify-start px-4">
            {headerContent}
          </div>

          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
