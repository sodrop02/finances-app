import type { Transaction as PlaidTransaction, RemovedTransaction } from 'plaid';
import { prisma } from './db.js';
import { decrypt } from './crypto.js';
import { plaid, toMinorUnits } from './plaid.js';

/**
 * Pull the latest account balances for an Item and upsert them.
 */
export async function syncAccounts(itemId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } });
  const accessToken = decrypt(item.accessToken);

  const { data } = await plaid.accountsGet({ access_token: accessToken });

  for (const acc of data.accounts) {
    await prisma.account.upsert({
      where: { plaidAccountId: acc.account_id },
      create: {
        plaidAccountId: acc.account_id,
        itemId: item.id,
        name: acc.name,
        officialName: acc.official_name ?? null,
        mask: acc.mask ?? null,
        type: String(acc.type),
        subtype: acc.subtype ? String(acc.subtype) : null,
        currentBalance: toMinorUnits(acc.balances.current),
        availableBalance: toMinorUnits(acc.balances.available),
        isoCurrencyCode: acc.balances.iso_currency_code ?? null,
      },
      update: {
        name: acc.name,
        officialName: acc.official_name ?? null,
        mask: acc.mask ?? null,
        type: String(acc.type),
        subtype: acc.subtype ? String(acc.subtype) : null,
        currentBalance: toMinorUnits(acc.balances.current),
        availableBalance: toMinorUnits(acc.balances.available),
        isoCurrencyCode: acc.balances.iso_currency_code ?? null,
      },
    });
  }
}

async function accountRowId(plaidAccountId: string, itemId: string): Promise<string | null> {
  const acc = await prisma.account.findUnique({ where: { plaidAccountId } });
  return acc?.id ?? null;
}

async function upsertTransaction(txn: PlaidTransaction, itemId: string) {
  const accId = await accountRowId(txn.account_id, itemId);
  if (!accId) return; // account not seen yet; syncAccounts runs first so this is rare

  const data = {
    itemId,
    accountId: accId,
    amount: toMinorUnits(txn.amount),
    isoCurrencyCode: txn.iso_currency_code ?? null,
    date: new Date(txn.date),
    authorizedDate: txn.authorized_date ? new Date(txn.authorized_date) : null,
    name: txn.name,
    merchantName: txn.merchant_name ?? null,
    category: txn.personal_finance_category?.primary ?? null,
    categoryDetailed: txn.personal_finance_category?.detailed ?? null,
    paymentChannel: txn.payment_channel ?? null,
    pending: txn.pending,
  };

  await prisma.transaction.upsert({
    where: { plaidTxnId: txn.transaction_id },
    create: { plaidTxnId: txn.transaction_id, ...data },
    update: data,
  });
}

/**
 * Incremental transactions sync for a single Item using the /transactions/sync
 * cursor. Handles added / modified / removed and pages until has_more is false.
 */
export async function syncTransactions(itemId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } });
  const accessToken = decrypt(item.accessToken);

  let cursor = item.cursor ?? undefined;
  let added: PlaidTransaction[] = [];
  let modified: PlaidTransaction[] = [];
  let removed: RemovedTransaction[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data } = await plaid.transactionsSync({
      access_token: accessToken,
      cursor,
    });
    added = added.concat(data.added);
    modified = modified.concat(data.modified);
    removed = removed.concat(data.removed);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  for (const txn of [...added, ...modified]) {
    await upsertTransaction(txn, itemId);
  }
  if (removed.length) {
    await prisma.transaction.deleteMany({
      where: { plaidTxnId: { in: removed.map((r) => r.transaction_id!) } },
    });
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { cursor },
  });

  await prisma.meta.upsert({
    where: { key: 'lastSyncAt' },
    create: { key: 'lastSyncAt', value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });

  return { added: added.length, modified: modified.length, removed: removed.length };
}

export async function syncItem(itemId: string) {
  await syncAccounts(itemId);
  return syncTransactions(itemId);
}

export async function syncAll() {
  const items = await prisma.item.findMany({ where: { status: 'active' } });
  const results: Record<string, unknown> = {};
  for (const item of items) {
    try {
      results[item.id] = await syncItem(item.id);
    } catch (err) {
      results[item.id] = { error: (err as Error).message };
    }
  }
  return results;
}
