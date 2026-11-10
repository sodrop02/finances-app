import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useAccounts, useItems, useRemoveItem } from '../lib/queries';
import { money } from '../lib/api';
import { PlaidLinkButton } from '../components/PlaidLinkButton';

export function Accounts() {
  const accounts = useAccounts();
  const items = useItems();
  const removeItem = useRemoveItem();

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700}>
          Accounts
        </Typography>
        <PlaidLinkButton />
      </Box>

      {items.data?.items.map((item) => {
        const itemAccounts = accounts.data?.accounts.filter((a) => a.itemId === item.id) ?? [];
        const needsReauth = item.status !== 'active';
        return (
          <Card key={item.id} sx={needsReauth ? { borderColor: 'warning.main', borderWidth: 1, borderStyle: 'solid' } : undefined}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{item.institution ?? 'Bank'}</Typography>
                  {needsReauth && <Chip size="small" color="warning" label="Needs reconnection" />}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {needsReauth && <PlaidLinkButton relinkItemId={item.id} />}
                  <Button
                    color="error"
                    size="small"
                    disabled={removeItem.isPending}
                    onClick={() => {
                      if (confirm(`Disconnect ${item.institution ?? 'this bank'}?`)) {
                        removeItem.mutate(item.id);
                      }
                    }}
                  >
                    Disconnect
                  </Button>
                </Box>
              </Box>
              {needsReauth && (
                <Typography variant="caption" color="text.secondary">
                  Plaid can no longer sync this account — the bank login needs to be re-verified.
                </Typography>
              )}
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                {itemAccounts.map((a) => (
                  <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      {a.name}
                      {a.mask ? ` ••${a.mask}` : ''}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {a.subtype ?? a.type}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {money(a.currentBalance, a.isoCurrencyCode ?? 'USD')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      {items.data?.items.length === 0 && (
        <Typography color="text.secondary">No banks connected yet.</Typography>
      )}
    </Stack>
  );
}
