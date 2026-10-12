import { useMemo } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import type { SxProps, Theme } from '@mui/material/styles';
import { useAccounts } from '../lib/queries';

// The dropdown value: everything, a whole institution, or one account.
export type AccountFilter =
  | { kind: 'all' }
  | { kind: 'item'; id: string }
  | { kind: 'account'; id: string };

export const ALL_ACCOUNTS: AccountFilter = { kind: 'all' };

function encode(f: AccountFilter): string {
  return f.kind === 'all' ? 'all' : `${f.kind}:${f.id}`;
}
function decode(v: string): AccountFilter {
  if (v === 'all') return { kind: 'all' };
  const [kind, id] = v.split(':');
  return { kind: kind as 'item' | 'account', id };
}

/** The `accountId` / `itemId` query params for a given selection. */
export function accountFilterParams(f: AccountFilter): { accountId?: string; itemId?: string } {
  if (f.kind === 'account') return { accountId: f.id };
  if (f.kind === 'item') return { itemId: f.id };
  return {};
}

export function AccountSelect({
  value,
  onChange,
  sx,
}: {
  value: AccountFilter;
  onChange: (f: AccountFilter) => void;
  sx?: SxProps<Theme>;
}) {
  const accounts = useAccounts();

  const institutions = useMemo(() => {
    const list = accounts.data?.accounts ?? [];
    const groups = new Map<string, { id: string; name: string; accounts: typeof list }>();
    for (const a of list) {
      const g = groups.get(a.item.id);
      if (g) g.accounts.push(a);
      else groups.set(a.item.id, { id: a.item.id, name: a.item.institution ?? 'Bank', accounts: [a] });
    }
    return [...groups.values()];
  }, [accounts.data]);

  return (
    <TextField
      select
      size="small"
      label="Account"
      value={encode(value)}
      onChange={(e) => onChange(decode(e.target.value))}
      sx={{ minWidth: 220, ...sx }}
    >
      <MenuItem value="all">All accounts</MenuItem>
      {institutions.flatMap((inst) => [
        <ListSubheader key={`h-${inst.id}`} disableSticky>
          {inst.name}
        </ListSubheader>,
        <MenuItem key={`i-${inst.id}`} value={`item:${inst.id}`}>
          All of {inst.name}
        </MenuItem>,
        ...inst.accounts.map((a) => (
          <MenuItem key={a.id} value={`account:${a.id}`} sx={{ pl: 4 }}>
            {a.name}
            {a.mask ? ` ••${a.mask}` : ''}
          </MenuItem>
        )),
      ])}
    </TextField>
  );
}
