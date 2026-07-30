import { StorageContext } from '@/contexts/StorageContext';
import { useContext } from 'react';

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within StorageProvider');
  }
  return context;
}
