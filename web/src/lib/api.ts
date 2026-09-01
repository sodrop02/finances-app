export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    // only send a JSON content-type when there's actually a body — Fastify
    // rejects an empty body when content-type is application/json
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ---- shared types ----
export interface Account {
  id: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string | null;
  item: { institution: string | null };
}

export interface Transaction {
  id: string;
  amount: number;
  isoCurrencyCode: string | null;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  pending: boolean;
  account: { name: string; mask: string | null };
}

export interface Summary {
  days: number;
  totalSpent: number;
  byCategory: { category: string; amount: number }[];
}

export interface PlaidItem {
  id: string;
  institution: string | null;
  status: string;
  createdAt: string;
  _count: { accounts: number; transactions: number };
}

// minor units (cents) -> display string
export function money(minor: number | null | undefined, currency = 'USD'): string {
  const value = (minor ?? 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}
