import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type SalesOrderMode = 'live' | 'test';

const STORAGE_KEY = 'admin-sales-order-mode';

type SalesOrderModeContextValue = {
  mode: SalesOrderMode;
  setMode: (mode: SalesOrderMode) => void;
};

const SalesOrderModeContext = createContext<SalesOrderModeContextValue | null>(null);

function readStoredMode(): SalesOrderMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'live' || saved === 'test') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'live';
}

export function SalesOrderModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SalesOrderMode>(readStoredMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }, [mode]);

  return (
    <SalesOrderModeContext.Provider value={{ mode, setMode }}>
      {children}
    </SalesOrderModeContext.Provider>
  );
}

export function useSalesOrderMode() {
  const context = useContext(SalesOrderModeContext);
  if (!context) {
    throw new Error('useSalesOrderMode must be used within SalesOrderModeProvider');
  }
  return context;
}
