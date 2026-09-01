import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type Account,
  type PlaidItem,
  type Summary,
  type Transaction,
} from './api';

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

export function useSummary(days = 30) {
  return useQuery({
    queryKey: ['summary', days],
    queryFn: () => api.get<Summary>(`/api/summary?days=${days}`),
  });
}

export function useTransactions(params: {
  page: number;
  pageSize: number;
  accountId?: string;
  search?: string;
}) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.accountId) search.set('accountId', params.accountId);
  if (params.search) search.set('search', params.search);
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () =>
      api.get<{ rows: Transaction[]; total: number }>(`/api/transactions?${search.toString()}`),
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
