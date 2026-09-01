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
import { useSync, useLogout } from '../lib/queries';

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
        <Tabs
          value={current}
          onChange={(_e, v: number) => navigate(tabs[v].to)}
          sx={{ px: 2 }}
        >
          {tabs.map((t) => (
            <Tab key={t.to} label={t.label} />
          ))}
        </Tabs>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
