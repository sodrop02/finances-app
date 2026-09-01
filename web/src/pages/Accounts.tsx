import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
        const itemAccounts =
          accounts.data?.accounts.filter((a) => a.item.institution === item.institution) ?? [];
        return (
          <Card key={item.id}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{item.institution ?? 'Bank'}</Typography>
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
