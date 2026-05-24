import { SupabaseStorageContext } from '@/contexts/SupabaseStorageContext';
import { useContext } from 'react';

export function useSupabaseStorage() {
  const context = useContext(SupabaseStorageContext);
  if (!context) {
    throw new Error('useSupabaseStorage must be used within SupabaseStorageProvider');
  }
  return context;
}
