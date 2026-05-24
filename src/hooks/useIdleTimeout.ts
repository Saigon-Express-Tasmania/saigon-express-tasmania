import { useEffect, useRef, useCallback, useState } from "react";

interface UseIdleTimeoutOptions {
  /** Time in ms before showing warning (default: 25 minutes) */
  idleTime?: number;
  /** Time in ms for countdown warning before logout (default: 60 seconds) */
  warningTime?: number;
  onIdle: () => void;
}

export function useIdleTimeout({
  idleTime = 25 * 60 * 1000,
  warningTime = 60 * 1000,
  onIdle,
}: UseIdleTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startWarningCountdown = useCallback(() => {
    const secs = Math.floor(warningTime / 1000);
    setCountdown(secs);
    setShowWarning(true);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      onIdle();
    }, warningTime);
  }, [warningTime, onIdle]);

  const resetTimer = useCallback(() => {
    if (showWarning) return; // Don't reset during warning countdown
    clearAllTimers();
    idleTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, idleTime);
  }, [clearAllTimers, idleTime, showWarning, startWarningCountdown]);

  const stayActive = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setCountdown(Math.floor(warningTime / 1000));
    idleTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, idleTime);
  }, [clearAllTimers, idleTime, warningTime, startWarningCountdown]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Start the timer on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearAllTimers();
    };
  }, [resetTimer, clearAllTimers]);

  return { showWarning, countdown, stayActive };
}
