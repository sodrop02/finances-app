import { useMemo, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import { useAccounts, useTransactions } from '../lib/queries';
import { money } from '../lib/api';
import { useHistoryRange } from '../lib/historyRange';
import { AmountBuckets, type BucketSelection } from '../components/AmountBuckets';

// The account dropdown value: everything, a whole institution, or one account.
type AccountFilter =
  | { kind: 'all' }
  | { kind: 'item'; id: string }
  | { kind: 'account'; id: string };

function encodeFilter(f: AccountFilter): string {
  return f.kind === 'all' ? 'all' : `${f.kind}:${f.id}`;
}
function decodeFilter(v: string): AccountFilter {
  if (v === 'all') return { kind: 'all' };
  const [kind, id] = v.split(':');
  return { kind: kind as 'item' | 'account', id };
}

const columns: GridColDef[] = [
  {
    field: 'date',
    headerName: 'Date',
    width: 120,
    valueFormatter: (value) => new Date(value as string).toLocaleDateString(),
  },
  { field: 'name', headerName: 'Description', flex: 1, minWidth: 200 },
  {
    field: 'category',
    headerName: 'Category',
    width: 170,
    renderCell: (params) =>
      params.value ? <Chip size="small" label={params.value} variant="outlined" /> : null,
  },
  {
    field: 'account',
    headerName: 'Account',
    width: 150,
    valueGetter: (_value, row) => row.account?.name,
  },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 130,
    type: 'number',
    // Plaid: positive = money out. Show outflow as negative, in red.
    valueFormatter: (value) => money(-(value as number)),
    cellClassName: (params) => ((params.value as number) > 0 ? 'outflow' : 'inflow'),
  },
];

export function Transactions() {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'date', sort: 'desc' }]);
  const [bucket, setBucket] = useState<BucketSelection | null>(null);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>({ kind: 'all' });

  const { days } = useHistoryRange();
  const accounts = useAccounts();

  // group accounts by institution for the dropdown
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

  const { data, isLoading } = useTransactions({
    page: pagination.page,
    pageSize: pagination.pageSize,
    days,
    search: search || undefined,
    accountId: accountFilter.kind === 'account' ? accountFilter.id : undefined,
    itemId: accountFilter.kind === 'item' ? accountFilter.id : undefined,
    sortField: sortModel[0]?.field,
    sortOrder: sortModel[0]?.sort ?? undefined,
    minAmount: bucket?.min,
    maxAmount: bucket?.max,
    pending: bucket ? false : undefined,
  });

  const resetPage = () => setPagination((p) => ({ ...p, page: 0 }));

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Transactions
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          size="small"
          label="Search description"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          sx={{ flex: 1, maxWidth: { sm: 320 } }}
        />
        <TextField
          select
          size="small"
          label="Account"
          value={encodeFilter(accountFilter)}
          onChange={(e) => {
            setAccountFilter(decodeFilter(e.target.value));
            resetPage();
          }}
          sx={{ minWidth: 220 }}
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
      </Stack>
      <AmountBuckets
        days={days}
        search={search || undefined}
        accountId={accountFilter.kind === 'account' ? accountFilter.id : undefined}
        itemId={accountFilter.kind === 'item' ? accountFilter.id : undefined}
        selected={bucket}
        onSelect={(b) => {
          setBucket(b ? { min: b.min, max: b.max } : null);
          resetPage();
        }}
      />
      <div style={{ width: '100%' }}>
        <DataGrid
          rows={data?.rows ?? []}
          columns={columns}
          loading={isLoading}
          rowCount={data?.total ?? 0}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[25, 50, 100]}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={(model) => {
            setSortModel(model);
            setPagination((p) => ({ ...p, page: 0 }));
          }}
          disableRowSelectionOnClick
          density="compact"
          sx={{
            '& .outflow': { color: 'error.main' },
            '& .inflow': { color: 'success.main' },
          }}
        />
      </div>
    </Stack>
  );
}
