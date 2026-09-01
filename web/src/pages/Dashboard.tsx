import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { useAccounts, useItems, useSummary } from '../lib/queries';
import { money } from '../lib/api';
import { useHistoryRange } from '../lib/historyRange';
import { PlaidLinkButton } from '../components/PlaidLinkButton';

export function Dashboard() {
  const { days } = useHistoryRange();
  const accounts = useAccounts();
  const summary = useSummary(days);
  const items = useItems();

  const noBanks = items.data && items.data.items.length === 0;

  const netWorth =
    accounts.data?.accounts.reduce((acc, a) => {
      const bal = a.currentBalance ?? 0;
      // credit/loan balances count against you
      return a.type === 'credit' || a.type === 'loan' ? acc - bal : acc + bal;
    }, 0) ?? 0;

  if (noBanks) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="h5" fontWeight={700}>
          Welcome
        </Typography>
        <Typography color="text.secondary">
          Connect a bank to start tracking. In Plaid sandbox, use{' '}
          <code>user_good</code> / <code>pass_good</code>.
        </Typography>
        <PlaidLinkButton />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700}>
          Dashboard
        </Typography>
        <PlaidLinkButton />
      </Box>

      {(accounts.isLoading || summary.isLoading) && <LinearProgress />}
      {summary.isError && <Alert severity="error">Failed to load summary</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Net worth
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {money(netWorth)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Spent (last {days} days)
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {money(summary.data?.totalSpent)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Accounts
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {accounts.data?.accounts.length ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Spending by category ({days} days)
          </Typography>
          <Stack spacing={1.5} mt={1}>
            {summary.data?.byCategory.map((c) => {
              const pct = summary.data.totalSpent
                ? (c.amount / summary.data.totalSpent) * 100
                : 0;
              return (
                <Box key={c.category}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{c.category}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {money(c.amount)}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              );
            })}
            {summary.data?.byCategory.length === 0 && (
              <Typography color="text.secondary">No spending recorded yet.</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
