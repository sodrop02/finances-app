import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridSortModel } from '@mui/x-data-grid';
import { useTransactions } from '../lib/queries';
import { formatDate, money } from '../lib/api';
import { useHistoryRange } from '../lib/historyRange';
import { AmountBuckets, type BucketSelection } from '../components/AmountBuckets';
import { AccountSelect, ALL_ACCOUNTS, accountFilterParams, type AccountFilter } from '../components/AccountSelect';

const columns: GridColDef[] = [
  {
    field: 'date',
    headerName: 'Date',
    width: 120,
    valueFormatter: (value) => formatDate(value as string),
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
  const [buckets, setBuckets] = useState<BucketSelection[]>([]);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>(ALL_ACCOUNTS);

  const { resolved } = useHistoryRange();
  const accountParams = accountFilterParams(accountFilter);

  const { data, isLoading } = useTransactions({
    page: pagination.page,
    pageSize: pagination.pageSize,
    from: resolved.from,
    to: resolved.to,
    search: search || undefined,
    ...accountParams,
    sortField: sortModel[0]?.field,
    sortOrder: sortModel[0]?.sort ?? undefined,
    amountBuckets: buckets.length ? buckets.map((b) => b.min) : undefined,
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
        <AccountSelect
          value={accountFilter}
          onChange={(f) => {
            setAccountFilter(f);
            resetPage();
          }}
        />
      </Stack>
      <AmountBuckets
        from={resolved.from}
        to={resolved.to}
        search={search || undefined}
        {...accountParams}
        selected={buckets}
        onToggle={(b) => {
          setBuckets((prev) =>
            prev.some((s) => s.min === b.min && s.max === b.max)
              ? prev.filter((s) => !(s.min === b.min && s.max === b.max))
              : [...prev, { min: b.min, max: b.max }],
          );
          resetPage();
        }}
        onClear={() => {
          setBuckets([]);
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
