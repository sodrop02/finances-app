import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { useTransactions } from '../lib/queries';
import { money } from '../lib/api';

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

  const { data, isLoading } = useTransactions({
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: search || undefined,
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Transactions
      </Typography>
      <TextField
        size="small"
        label="Search description"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPagination((p) => ({ ...p, page: 0 }));
        }}
        sx={{ maxWidth: 320 }}
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
