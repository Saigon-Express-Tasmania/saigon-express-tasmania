import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerAllModules } from 'handsontable/registry';

import './index.css';

import 'handsontable/styles/handsontable.css';
import 'handsontable/styles/ht-theme-horizon.css';
import 'handsontable/styles/ht-theme-main.css';

import App from './App.tsx';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext.tsx';
import { StorageProvider } from './contexts/StorageContext.tsx';
import { UserProfileProvider } from './contexts/UserProfileContext.tsx';
import { Toaster } from 'sonner';

registerAllModules();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseAuthProvider>
      <StorageProvider>
        <UserProfileProvider>
          <App />
          <Toaster richColors position="top-right" closeButton />
        </UserProfileProvider>
      </StorageProvider>
    </SupabaseAuthProvider>
  </StrictMode>,
);
