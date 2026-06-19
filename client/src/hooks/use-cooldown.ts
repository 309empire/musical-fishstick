import { useState, useCallback, useRef } from "react";

export function useCooldown(ms = 2000) {
  const [cooling, setCooling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCooling(true);
    timer.current = setTimeout(() => {
      setCooling(false);
      timer.current = null;
    }, ms);
  }, [ms]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCooling(false);
  }, []);

  return [cooling, trigger, reset] as const;
}

export function useThrottle<T extends (...args: any[]) => any>(fn: T, ms = 1500): [T, boolean] {
  const [throttled, setThrottled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledFn = useCallback((...args: Parameters<T>) => {
    if (throttled) return;
    fn(...args);
    setThrottled(true);
    timerRef.current = setTimeout(() => {
      setThrottled(false);
    }, ms);
  }, [fn, throttled, ms]) as T;

  return [throttledFn, throttled];
}
