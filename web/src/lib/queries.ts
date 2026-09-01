import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type Account,
  type AmountBucket,
  type PlaidItem,
  type Summary,
  type Transaction,
} from './api';
import { sinceDate } from './historyRange';

export function useAuth() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: () => api.get<{ authenticated: boolean }>('/api/auth/me'),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post('/api/auth/login', { password }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/auth/logout'),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<{ accounts: Account[] }>('/api/accounts'),
  });
}

export function useSummary(days = 120) {
  return useQuery({
    queryKey: ['summary', days],
    queryFn: () => api.get<Summary>(`/api/summary?days=${days}`),
  });
}

export function useTransactions(params: {
  page: number;
  pageSize: number;
  accountId?: string;
  itemId?: string;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  minAmount?: number;
  maxAmount?: number | null;
  pending?: boolean;
  /** limit to the last N days of history */
  days?: number;
}) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.accountId) search.set('accountId', params.accountId);
  if (params.itemId) search.set('itemId', params.itemId);
  if (params.days) search.set('from', sinceDate(params.days));
  if (params.search) search.set('search', params.search);
  if (params.sortField) search.set('sortField', params.sortField);
  if (params.sortOrder) search.set('sortOrder', params.sortOrder);
  if (params.minAmount !== undefined) search.set('minAmount', String(params.minAmount));
  if (params.maxAmount !== undefined && params.maxAmount !== null)
    search.set('maxAmount', String(params.maxAmount));
  if (params.pending !== undefined) search.set('pending', String(params.pending));
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () =>
      api.get<{ rows: Transaction[]; total: number }>(`/api/transactions?${search.toString()}`),
    // keep showing the current page's rows while the next page loads, instead
    // of briefly dropping to rows:[] / total:0 — which was making the DataGrid
    // clamp its pagination back to page 1 on every page change
    placeholderData: keepPreviousData,
  });
}

export function useTransactionBuckets(params: {
  accountId?: string;
  itemId?: string;
  search?: string;
  days?: number;
}) {
  const search = new URLSearchParams();
  if (params.accountId) search.set('accountId', params.accountId);
  if (params.itemId) search.set('itemId', params.itemId);
  if (params.days) search.set('from', sinceDate(params.days));
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  return useQuery({
    queryKey: ['transaction-buckets', params],
    queryFn: () => api.get<{ buckets: AmountBucket[] }>(`/api/transactions/buckets${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => api.get<{ items: PlaidItem[] }>('/api/plaid/items'),
  });
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: () => api.post<{ link_token: string }>('/api/plaid/link-token'),
  });
}

export function useExchangeToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      public_token: string;
      institution?: { institution_id?: string; name?: string };
    }) => api.post('/api/plaid/exchange', input),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/plaid/sync'),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRemoveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/plaid/items/${id}`),
    onSuccess: () => qc.invalidateQueries(),
  });
}
