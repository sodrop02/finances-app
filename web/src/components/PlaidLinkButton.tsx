import { useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link';
import { useCreateLinkToken, useExchangeToken, useRelinkComplete } from '../lib/queries';

/**
 * Renders "Connect a bank" — or, with `relinkItemId`, "Reconnect" for an
 * existing item whose login went stale (e.g. ITEM_LOGIN_REQUIRED).
 *
 * New-bank flow: ask for a link_token -> open Link -> on success, exchange
 * the public_token for an access_token + sync.
 *
 * Update-mode flow (relinkItemId set): ask for an update-mode link_token (tied
 * to the existing item) -> open Link -> on success the item's *existing*
 * access_token is valid again, so just clear its error status and resync.
 */
export function PlaidLinkButton({
  relinkItemId,
  label,
}: {
  relinkItemId?: string;
  label?: string;
}) {
  const createToken = useCreateLinkToken();
  const exchange = useExchangeToken();
  const relinkComplete = useRelinkComplete();
  const linkToken = createToken.data?.link_token ?? null;

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken, metadata) => {
      if (relinkItemId) {
        relinkComplete.mutate(relinkItemId);
        return;
      }
      exchange.mutate({
        public_token: publicToken,
        institution: metadata.institution
          ? {
              institution_id: metadata.institution.institution_id,
              name: metadata.institution.name,
            }
          : undefined,
      });
    },
    [exchange, relinkComplete, relinkItemId],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  // Once we have a token, open Link automatically.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const busy = createToken.isPending || exchange.isPending || relinkComplete.isPending;

  return (
    <Button
      variant={relinkItemId ? 'outlined' : 'contained'}
      color={relinkItemId ? 'warning' : 'primary'}
      size={relinkItemId ? 'small' : 'medium'}
      startIcon={relinkItemId ? <RefreshIcon /> : <AddIcon />}
      disabled={busy}
      onClick={() => createToken.mutate(relinkItemId)}
    >
      {busy ? 'Working…' : label ?? (relinkItemId ? 'Reconnect' : 'Connect a bank')}
    </Button>
  );
}
