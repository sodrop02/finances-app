import { useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link';
import { useCreateLinkToken, useExchangeToken } from '../lib/queries';

/**
 * Renders "Connect a bank". Flow:
 *  1. ask the API for a link_token
 *  2. open Plaid Link with it
 *  3. on success, hand the public_token back to the API to exchange + sync
 */
export function PlaidLinkButton() {
  const createToken = useCreateLinkToken();
  const exchange = useExchangeToken();
  const linkToken = createToken.data?.link_token ?? null;

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken, metadata) => {
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
    [exchange],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  // Once we have a token, open Link automatically.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      disabled={createToken.isPending || exchange.isPending}
      onClick={() => createToken.mutate()}
    >
      {exchange.isPending ? 'Importing…' : 'Connect a bank'}
    </Button>
  );
}
