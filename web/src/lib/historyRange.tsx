import { createContext, useContext, useState, type ReactNode } from 'react';

export const HISTORY_DAY_OPTIONS = [30, 60, 90] as const;
export type HistoryDays = (typeof HISTORY_DAY_OPTIONS)[number];

const STORAGE_KEY = 'historyDays';
const DEFAULT_DAYS: HistoryDays = 90;

function initialDays(): HistoryDays {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    if ((HISTORY_DAY_OPTIONS as readonly number[]).includes(v)) return v as HistoryDays;
  } catch {
    /* ignore unavailable storage */
  }
  return DEFAULT_DAYS;
}

interface HistoryRangeValue {
  days: HistoryDays;
  setDays: (d: HistoryDays) => void;
}

const HistoryRangeContext = createContext<HistoryRangeValue | null>(null);

export function HistoryRangeProvider({ children }: { children: ReactNode }) {
  const [days, setDaysState] = useState<HistoryDays>(initialDays);

  const setDays = (d: HistoryDays) => {
    setDaysState(d);
    try {
      localStorage.setItem(STORAGE_KEY, String(d));
    } catch {
      /* ignore */
    }
  };

  return (
    <HistoryRangeContext.Provider value={{ days, setDays }}>{children}</HistoryRangeContext.Provider>
  );
}

export function useHistoryRange(): HistoryRangeValue {
  const ctx = useContext(HistoryRangeContext);
  if (!ctx) throw new Error('useHistoryRange must be used inside <HistoryRangeProvider>');
  return ctx;
}

/** ISO date (YYYY-MM-DD) for `days` ago — stable within a calendar day, good as a query key. */
export function sinceDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
