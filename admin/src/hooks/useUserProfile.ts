import { UserProfileContext } from '@/contexts/UserProfileContext';
import { useContext } from 'react';

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
}
