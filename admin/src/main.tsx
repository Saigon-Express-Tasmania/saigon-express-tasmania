import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerAllModules } from 'handsontable/registry';

import './index.css';

import 'handsontable/styles/handsontable.css';
import 'handsontable/styles/ht-theme-horizon.css';
import 'handsontable/styles/ht-theme-main.css';

import App from './App.tsx';
import { MasterDataProvider } from './contexts/MasterDataContext.tsx';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext.tsx';
import { SupabaseStorageProvider } from './contexts/SupabaseStorageContext.tsx';
import { UserProfileProvider } from './contexts/UserProfileContext.tsx';
import { Toaster } from 'sonner';

registerAllModules();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SupabaseAuthProvider>
      <SupabaseStorageProvider>
        <UserProfileProvider>
          <MasterDataProvider>
            <App />
            <Toaster richColors position="top-right" closeButton />
          </MasterDataProvider>
        </UserProfileProvider>
      </SupabaseStorageProvider>
    </SupabaseAuthProvider>
  </StrictMode>,
);
