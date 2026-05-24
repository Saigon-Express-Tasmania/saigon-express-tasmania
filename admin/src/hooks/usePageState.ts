import { useEffect, useState } from 'react';

/**
 * A generic hook for persisting state to localStorage
 * @param key - The localStorage key
 * @param defaultValue - The default value if nothing is stored
 * @returns A tuple of [state, setState] similar to useState
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved) as T;
      }
      return defaultValue;
    } catch (err) {
      console.warn(`Failed to read from localStorage key "${key}":`, err);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn(`Failed to write to localStorage key "${key}":`, err);
    }
  }, [key, state]);

  return [state, setState] as const;
}

/**
 * A hook for persisting page-specific state to localStorage
 * @param pageName - The name of the page (e.g., 'fortunePoems', 'users')
 * @param defaultState - The default state object
 * @returns A tuple of [state, setState]
 */
export function usePageState<T extends Record<string, any>>(
  pageName: string,
  defaultState: T,
) {
  return useLocalStorage<T>(`pageState_${pageName}`, defaultState);
}
