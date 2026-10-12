import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export const ROLLING_DAY_OPTIONS = [30, 60, 90] as const;
export type RollingDays = (typeof ROLLING_DAY_OPTIONS)[number];

export type HistoryRange =
  | { kind: 'rolling'; days: RollingDays }
  | { kind: 'month'; year: number; month: number }; // month: 0-11, a specific calendar month

export interface ResolvedRange {
  /** ISO date (YYYY-MM-DD), inclusive lower bound */
  from: string;
  /** ISO date (YYYY-MM-DD), inclusive upper bound — unset for "rolling" (means "through now") */
  to?: string;
  /** human label, e.g. "Last 90 days" or "September 2026" */
  label: string;
}

const STORAGE_KEY = 'historyRange';
const DEFAULT_RANGE: HistoryRange = { kind: 'rolling', days: 90 };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isValidRange(v: unknown): v is HistoryRange {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.kind === 'rolling') return (ROLLING_DAY_OPTIONS as readonly number[]).includes(o.days as number);
  if (o.kind === 'month') return typeof o.year === 'number' && typeof o.month === 'number';
  return false;
}

function initialRange(): HistoryRange {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidRange(parsed)) return parsed;
    }
  } catch {
    /* ignore unavailable storage / bad JSON */
  }
  return DEFAULT_RANGE;
}

export function resolveRange(range: HistoryRange): ResolvedRange {
  if (range.kind === 'rolling') {
    const from = new Date();
    from.setDate(from.getDate() - range.days);
    return { from: toISODate(from), label: `Last ${range.days} days` };
  }
  const from = new Date(range.year, range.month, 1);
  const to = new Date(range.year, range.month + 1, 0); // last day of that month
  return {
    from: toISODate(from),
    to: toISODate(to),
    label: from.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  };
}

/** The last `count` calendar months, most recent (current month) first. */
export function recentMonths(count = 12): { year: number; month: number; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    };
  });
}

interface HistoryRangeValue {
  range: HistoryRange;
  setRange: (r: HistoryRange) => void;
  resolved: ResolvedRange;
}

const HistoryRangeContext = createContext<HistoryRangeValue | null>(null);

export function HistoryRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<HistoryRange>(initialRange);

  const setRange = (r: HistoryRange) => {
    setRangeState(r);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    } catch {
      /* ignore */
    }
  };

  const resolved = useMemo(() => resolveRange(range), [range]);

  return (
    <HistoryRangeContext.Provider value={{ range, setRange, resolved }}>
      {children}
    </HistoryRangeContext.Provider>
  );
}

export function useHistoryRange(): HistoryRangeValue {
  const ctx = useContext(HistoryRangeContext);
  if (!ctx) throw new Error('useHistoryRange must be used inside <HistoryRangeProvider>');
  return ctx;
}
