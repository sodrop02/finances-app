import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { useSync, useLogout } from '../lib/queries';
import { HISTORY_DAY_OPTIONS, useHistoryRange, type HistoryDays } from '../lib/historyRange';

const tabs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Accounts', to: '/accounts' },
];

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const sync = useSync();
  const logout = useLogout();
  const { days, setDays } = useHistoryRange();
  const current = Math.max(
    0,
    tabs.findIndex((t) => t.to === location.pathname),
  );

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            💸 Finances
          </Typography>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button color="inherit" onClick={() => logout.mutate()}>
            Log out
          </Button>
        </Toolbar>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            px: 2,
          }}
        >
          <Tabs value={current} onChange={(_e, v: number) => navigate(tabs[v].to)}>
            {tabs.map((t) => (
              <Tab key={t.to} label={t.label} />
            ))}
          </Tabs>
          <TextField
            select
            size="small"
            variant="standard"
            label="History"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as HistoryDays)}
            sx={{ minWidth: 120, flexShrink: 0, alignSelf: 'center' }}
          >
            {HISTORY_DAY_OPTIONS.map((d) => (
              <MenuItem key={d} value={d}>
                Last {d} days
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
