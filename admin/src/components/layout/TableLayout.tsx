import { AlertCircle, ArrowUpWideNarrow, Loader2, Plus, RefreshCcwDotIcon, Save } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DashboardLayout } from './DashboardLayout';

interface TableLayoutProps {
  loading: boolean;
  error: string | null;
  title?: string;
  rows: any[];
  headerContent?: ReactNode;
  cardTitle?: ReactNode;
  cardDescription?: ReactNode;
  noDataContent?: ReactNode;  
  hotTableRef: React.RefObject<HTMLDivElement | null>;

  refresh: () => void;
  versionUp: () => void;
  addRow: () => void;
  saveData: () => void;
}

export function TableLayout({
  loading,
  error,
  title,
  headerContent,
  cardTitle,
  cardDescription,
  noDataContent,
  rows,
  hotTableRef,
  refresh,
  versionUp,
  addRow,
  saveData,
}: TableLayoutProps) {
  return (
    <DashboardLayout title={title} headerContent={headerContent}>
      <div className="flex flex-col gap-6 h-full">
        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-4 flex items-start gap-3 flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Error</h3>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Grid Editor */}
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {cardTitle}
                </CardTitle>
                <CardDescription>
                  {cardDescription}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={refresh}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      <RefreshCcwDotIcon className="mr-2 h-4 w-4" />
                    </>
                  )}
                  Reload
                </Button>
                <Button onClick={versionUp} disabled={loading} size="sm">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      <ArrowUpWideNarrow className="mr-2 h-4 w-4" />
                    </>
                  )}
                  Version Up
                </Button>
                <Button
                  onClick={addRow}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
                <Button onClick={saveData} disabled={loading} size="sm">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                    </>
                  )}
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {loading && rows.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && rows.length === 0 && (
              noDataContent
            )}

            <div className="flex-1 min-h-0">
              <div
                ref={hotTableRef}
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'auto',
                  display: loading || rows.length === 0 ? 'none' : 'block',
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
