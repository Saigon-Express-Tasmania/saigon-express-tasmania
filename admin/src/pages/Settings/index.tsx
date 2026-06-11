import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_HANDSON_TABLE_OPTIONS, ENV } from '@/constants';
import { usePageState } from '@/hooks/usePageState';
import {
  mergeColumnWidths,
  textColumnsFromWidths,
} from '@/lib/handsontableColumnWidths';
import Handsontable from 'handsontable';
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { fetchSettings, saveSettings } from '@/lib/settings';
import { revalidateFrontendCache } from './tools';
import type { SettingRow, SettingsTableUiState } from './types';

const SETTINGS_DEFAULT_COLUMN_WIDTHS: readonly number[] = [280, 620];
const SETTINGS_COL_HEADERS = ['Key', 'Value'];

function rowToSetting(row: unknown[]): SettingRow {
  return {
    key: String(row[0] ?? ''),
    value: String(row[1] ?? ''),
  };
}

function settingToRow(setting: SettingRow): string[] {
  return [setting.key, setting.value];
}

function getSettingValue(
  rows: SettingRow[],
  ...candidateKeys: string[]
): string | undefined {
  const keySet = new Set(candidateKeys.map((key) => key.toLowerCase()));
  const row = rows.find((item) => keySet.has(item.key.trim().toLowerCase()));
  const value = row?.value?.trim();
  return value ? value : undefined;
}

export function Settings() {
  const hotTableRef = useRef<HTMLDivElement | null>(null);
  const hotInstanceRef = useRef<Handsontable | null>(null);

  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningTool, setIsRunningTool] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableUpdateTimestamp, setTableUpdateTimestamp] = useState(0);

  const [tableUi, setTableUi] = usePageState<SettingsTableUiState>(
    'settingsTable',
    {},
  );

  const getSettingsFromTable = (): SettingRow[] => {
    if (!hotInstanceRef.current) return settings;
    const data = hotInstanceRef.current.getData?.();
    if (!data) return settings;
    return data.map((row: unknown[]) => rowToSetting(row));
  };

  const refreshSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedSettings = await fetchSettings();
      setTableUpdateTimestamp(Date.now());
      setSettings(loadedSettings);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load settings.';
      setError(message);
      setTableUpdateTimestamp(Date.now());
      setSettings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSettings();
  }, []);

  useEffect(() => {
    if (!hotTableRef.current) return;

    const colWidths = mergeColumnWidths(
      SETTINGS_DEFAULT_COLUMN_WIDTHS,
      tableUi.columnWidths,
    );

    const instance = new Handsontable(hotTableRef.current, {
      ...DEFAULT_HANDSON_TABLE_OPTIONS,
      stretchH: 'none',
      data: [],
      colHeaders: SETTINGS_COL_HEADERS,
      columns: textColumnsFromWidths(colWidths),
      afterColumnResize: (newSize, column) => {
        setTableUi((prev) => {
          const merged = mergeColumnWidths(
            SETTINGS_DEFAULT_COLUMN_WIDTHS,
            prev.columnWidths,
          );
          merged[column] = newSize;
          return { ...prev, columnWidths: merged };
        });
      },
      afterChange: () => {
        if (!hotInstanceRef.current) return;
        const data = hotInstanceRef.current.getData?.();
        if (!data) return;
        setSettings(data.map((row: unknown[]) => rowToSetting(row)));
      },
      afterRemoveRow: () => {
        if (!hotInstanceRef.current) return;
        const data = hotInstanceRef.current.getData?.();
        if (!data) return;
        setSettings(data.map((row: unknown[]) => rowToSetting(row)));
      },
    });

    hotInstanceRef.current = instance;

    return () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
        hotInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only Handsontable init

  useEffect(() => {
    if (!hotInstanceRef.current) return;
    hotInstanceRef.current.loadData(settings.map((setting) => settingToRow(setting)));
  }, [tableUpdateTimestamp]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const savedSettings = getSettingsFromTable();
      await saveSettings(savedSettings);
      setSettings(savedSettings);
      toast.success('Settings saved.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save settings.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRow = () => {
    setTableUpdateTimestamp(Date.now());
    setSettings((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleRevalidateFrontend = async () => {
    setIsRunningTool(true);
    try {
      const tableSettings = getSettingsFromTable();
      const frontendUrl = getSettingValue(tableSettings, 'site_url');

      await revalidateFrontendCache({
        frontendUrl: frontendUrl ?? '',
        revalidateToken: ENV.cacheRevalidateSecret ?? '',
      });
      toast.success('Frontend cache revalidated.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to revalidate frontend cache.';
      toast.error(message);
    } finally {
      setIsRunningTool(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="flex flex-col gap-6 h-full">
        {error && (
          <div className="rounded-md bg-destructive/10 p-4 flex items-start gap-3 flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Error</h3>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Settings Table</CardTitle>
                <CardDescription>
                  Edit key/value pairs stored in the settings table.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isRunningTool}>
                      {isRunningTool ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wrench className="mr-2 h-4 w-4" />
                      )}
                      Tools
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => void handleRevalidateFrontend()}
                      disabled={isRunningTool}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Revalidate Frontend Cache
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={handleAddRow}
                  disabled={isLoading || isSaving}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
                <Button
                  onClick={() => void handleSaveSettings()}
                  disabled={isLoading || isSaving}
                  size="sm"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && settings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No settings yet</p>
                <Button onClick={handleAddRow} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Setting
                </Button>
              </div>
            )}

            <div className="flex-1 min-h-0">
              <div
                ref={hotTableRef}
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'auto',
                  display: isLoading || settings.length === 0 ? 'none' : 'block',
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
