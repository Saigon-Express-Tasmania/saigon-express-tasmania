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
  DEFAULT_HANDSON_TABLE_OPTIONS,
  LANGUAGE_LABELS,
  LOCALIZATION_FILE_NAME,
  SUPPORTED_LANGUAGES,
  STORAGE_BUCKET,
} from '@/constants';
import type { LanguageKey } from '@/types';
import { usePageState } from '@/hooks/usePageState';
import {
  mergeColumnWidths,
  textColumnsFromWidths,
} from '@/lib/handsontableColumnWidths';
import supabase from '@/lib/supabase/client';
import type { LocalizationTranslationType } from '@/types/Localization';
import Handsontable from 'handsontable';
import {
  AlertCircle,
  Loader2,
  Plus,
  Save,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LOCALIZATION_FILE_PATH = `${LOCALIZATION_FILE_NAME}.json`;

const LOCALIZATION_DEFAULT_COLUMN_WIDTHS: readonly number[] = [
  80,
  ...SUPPORTED_LANGUAGES.map(() => 240),
];

const LOCALIZATION_COL_HEADERS = [
  'Key',
  ...SUPPORTED_LANGUAGES.map((lang) => LANGUAGE_LABELS[lang]),
];

function emptyTranslations(): Record<LanguageKey, string> {
  return Object.fromEntries(
    SUPPORTED_LANGUAGES.map((lang) => [lang, '']),
  ) as Record<LanguageKey, string>;
}

function rowToTranslation(row: unknown[]): LocalizationTranslationType {
  const translations = SUPPORTED_LANGUAGES.reduce(
    (acc, lang, index) => {
      acc[lang] = String(row[index + 1] ?? '');
      return acc;
    },
    {} as Record<LanguageKey, string>,
  );

  return {
    key: String(row[0] ?? ''),
    translations,
  };
}

function translationToRow(translation: LocalizationTranslationType): string[] {
  return [
    translation.key,
    ...SUPPORTED_LANGUAGES.map((lang) => translation.translations[lang] ?? ''),
  ];
}

interface LocalizationTableUiState {
  columnWidths?: number[];
}

export function LocalizationPage() {
  const hotTableRef = useRef(null);
  const hotInstanceRef = useRef<any>(null);

  const [translations, setTranslations] = useState<
    LocalizationTranslationType[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableUpdateTimestamp, setTableUpdateTimestamp] = useState(0);

  const [tableUi, setTableUi] = usePageState<LocalizationTableUiState>(
    'localizationTable',
    {},
  );

  // Load translations on mount
  useEffect(() => {
    void loadTranslations();
  }, []);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(LOCALIZATION_FILE_PATH);

      if (
        downloadError &&
        downloadError.message !== 'Not found' &&
        downloadError.message !== '{}'
      ) {
        throw downloadError;
      }

      if (data) {
        const text = await data.text();
        const translations = JSON.parse(text);
        // Clear the timestamp to signal this is external data (not from table)
        setTableUpdateTimestamp(Date.now());
        setTranslations(translations);
      } else {
        // File not found, start with empty object
        setTableUpdateTimestamp(Date.now());
        setTranslations([]);
      }
    } catch (err: any) {
      // Only show real errors, not "file not found"
      if (err.message && !err.message.includes('Not found')) {
        setError(`Failed to load translations: ${err.message}`);
      }
      setTableUpdateTimestamp(Date.now());
      setTranslations([]);
    } finally {
      setLoading(false);
    }
  };

  const getTranslationsFromTable = (): LocalizationTranslationType[] => {
    if (!hotInstanceRef.current) return translations;
    const data = hotInstanceRef.current.getData?.();
    if (!data) return translations;

    return data.map((row: unknown[]) => rowToTranslation(row));
  };

  const saveTranslations = async () => {
    try {
      setLoading(true);

      const currentTranslations = getTranslationsFromTable();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(
          LOCALIZATION_FILE_PATH,
          JSON.stringify(currentTranslations, null, 2),
          {
          upsert: true,
          contentType: 'application/json',
          },
        );

      if (uploadError) throw uploadError;
    } catch (err: any) {
      setError(`Failed to save translations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    if (!hotInstanceRef.current) return;
    const newRow: LocalizationTranslationType = {
      key: '',
      translations: emptyTranslations(),
    };

    setTableUpdateTimestamp(Date.now());
    setTranslations([...translations, newRow]);
  };

  const handleTableChange = (_changes: any, _source: any) => {
    if (!hotInstanceRef.current) return;
    const data = hotInstanceRef.current.getData?.();
    if (!data) return;

    setTranslations(data.map((row: unknown[]) => rowToTranslation(row)));
  };

  const handleTableRemoveRow = () => {
    if (!hotInstanceRef.current) return;
    const data = hotInstanceRef.current.getData?.();
    if (!data) return;

    setTranslations(data.map((row: unknown[]) => rowToTranslation(row)));
  };

  // Initialize Handsontable on mount
  useEffect(() => {
    if (!hotTableRef.current) return;

    const container = hotTableRef.current as HTMLElement;

    const initTable = () => {
      try {
        const colWidths = mergeColumnWidths(
          LOCALIZATION_DEFAULT_COLUMN_WIDTHS,
          tableUi.columnWidths,
        );

        const instance = new Handsontable(container, {
          ...DEFAULT_HANDSON_TABLE_OPTIONS,
          stretchH: 'none',
          data: [],
          colHeaders: LOCALIZATION_COL_HEADERS,
          columns: textColumnsFromWidths(colWidths),
          afterColumnResize: (newSize, column) => {
            setTableUi((prev) => {
              const merged = mergeColumnWidths(
                LOCALIZATION_DEFAULT_COLUMN_WIDTHS,
                prev.columnWidths,
              );
              merged[column] = newSize;
              return { ...prev, columnWidths: merged };
            });
          },
          afterChange: handleTableChange,
          afterRemoveRow: handleTableRemoveRow,
        });

        hotInstanceRef.current = instance;
      } catch (err) {
        console.error('Failed to initialize Handsontable:', err);
      }
    };

    initTable();

    return () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
        hotInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only init; column widths from persisted tableUi on first paint

  // Update table data when translations change
  useEffect(() => {
    if (!hotInstanceRef.current) return;

    const tableData = translations.map((translation) =>
      translationToRow(translation),
    );

    hotInstanceRef.current.loadData(tableData);
  }, [tableUpdateTimestamp]);

  return (
    <DashboardLayout title="Localization">
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
                <CardTitle></CardTitle>
                <CardDescription>`localization.json`</CardDescription>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={addRow}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Row
                  </Button>
                  <Button
                    onClick={saveTranslations}
                    disabled={loading}
                    size="sm"
                  >
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
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && translations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No translations yet
                </p>
                <Button onClick={addRow} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Translation
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
                  display:
                    loading || translations.length === 0 ? 'none' : 'block',
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
