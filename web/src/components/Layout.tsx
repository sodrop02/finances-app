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
import ListSubheader from '@mui/material/ListSubheader';
import { useSync, useLogout } from '../lib/queries';
import {
  ROLLING_DAY_OPTIONS,
  recentMonths,
  useHistoryRange,
  type HistoryRange,
} from '../lib/historyRange';

const tabs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Accounts', to: '/accounts' },
];

function encodeRange(r: HistoryRange): string {
  return r.kind === 'rolling' ? `rolling:${r.days}` : `month:${r.year}-${r.month}`;
}
function decodeRange(v: string): HistoryRange {
  const [kind, rest] = v.split(':');
  if (kind === 'rolling') return { kind: 'rolling', days: Number(rest) as 30 | 60 | 90 };
  const [year, month] = rest.split('-').map(Number);
  return { kind: 'month', year, month };
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const sync = useSync();
  const logout = useLogout();
  const { range, setRange } = useHistoryRange();
  const months = recentMonths(12);
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
            value={encodeRange(range)}
            onChange={(e) => setRange(decodeRange(e.target.value))}
            slotProps={{ select: { MenuProps: { PaperProps: { sx: { maxHeight: 420 } } } } }}
            sx={{ minWidth: 170, flexShrink: 0, alignSelf: 'center' }}
          >
            <ListSubheader disableSticky>Quick ranges</ListSubheader>
            {ROLLING_DAY_OPTIONS.map((d) => (
              <MenuItem key={d} value={`rolling:${d}`}>
                Last {d} days
              </MenuItem>
            ))}
            <ListSubheader disableSticky>By month</ListSubheader>
            {months.map((m) => (
              <MenuItem key={`${m.year}-${m.month}`} value={`month:${m.year}-${m.month}`}>
                {m.label}
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
