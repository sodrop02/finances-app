import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { env } from './env.js';

const configuration = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
});

export const plaid = new PlaidApi(configuration);

// Converts a Plaid money amount (float, in the account's currency units) to
// integer minor units (cents). Plaid convention: positive = money leaving the account.
export function toMinorUnits(amount: number | null | undefined): number {
  return Math.round((amount ?? 0) * 100);
}
