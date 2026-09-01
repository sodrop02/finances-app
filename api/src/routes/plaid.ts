import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CountryCode, Products } from 'plaid';
import { prisma } from '../db.js';
import { decrypt, encrypt } from '../crypto.js';
import { plaid } from '../plaid.js';
import { env } from '../env.js';
import { requireAuth } from '../auth.js';
import { syncAll, syncItem } from '../sync.js';

export async function plaidRoutes(app: FastifyInstance) {
  // Create a Link token — the frontend feeds this to Plaid Link.
  app.post('/api/plaid/link-token', { preHandler: requireAuth }, async () => {
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: 'single-user' },
      client_name: 'Finances App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      ...(env.PLAID_WEBHOOK_URL ? { webhook: env.PLAID_WEBHOOK_URL } : {}),
      // comfortably covers the app's history selector; Plaid backfills more over time
      transactions: { days_requested: 180 },
    });
    return { link_token: data.link_token };
  });

  // Exchange the public_token from Link for a permanent access_token, store the Item,
  // then do an initial sync.
  app.post('/api/plaid/exchange', { preHandler: requireAuth }, async (request, reply) => {
    const body = z
      .object({
        public_token: z.string(),
        institution: z
          .object({ institution_id: z.string().optional(), name: z.string().optional() })
          .optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'bad request' });

    const { data } = await plaid.itemPublicTokenExchange({
      public_token: body.data.public_token,
    });

    const item = await prisma.item.upsert({
      where: { plaidItemId: data.item_id },
      create: {
        plaidItemId: data.item_id,
        accessToken: encrypt(data.access_token),
        institutionId: body.data.institution?.institution_id ?? null,
        institution: body.data.institution?.name ?? null,
      },
      update: {
        accessToken: encrypt(data.access_token),
        status: 'active',
      },
    });

    const result = await syncItem(item.id);
    return { item_id: item.id, ...result };
  });

  // Manual "refresh now" button.
  app.post('/api/plaid/sync', { preHandler: requireAuth }, async () => {
    return syncAll();
  });

  // List connected institutions.
  app.get('/api/plaid/items', { preHandler: requireAuth }, async () => {
    const items = await prisma.item.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        institution: true,
        status: true,
        createdAt: true,
        _count: { select: { accounts: true, transactions: true } },
      },
    });
    return { items };
  });

  // Disconnect an institution.
  app.delete('/api/plaid/items/:id', { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const item = await prisma.item.findUnique({ where: { id: params.id } });
    if (!item) return reply.code(404).send({ error: 'not found' });
    try {
      await plaid.itemRemove({ access_token: decrypt(item.accessToken) });
    } catch {
      // ignore — remove locally regardless
    }
    await prisma.item.delete({ where: { id: params.id } });
    return { ok: true };
  });

  // Plaid webhook receiver. No auth cookie — Plaid calls this directly.
  // In production, verify the JWT in the Plaid-Verification header.
  app.post('/api/plaid/webhook', async (request) => {
    const body = request.body as { webhook_type?: string; webhook_code?: string; item_id?: string };
    app.log.info({ webhook: body }, 'plaid webhook');

    if (
      body.webhook_type === 'TRANSACTIONS' &&
      body.item_id &&
      ['SYNC_UPDATES_AVAILABLE', 'DEFAULT_UPDATE', 'INITIAL_UPDATE', 'HISTORICAL_UPDATE'].includes(
        body.webhook_code ?? '',
      )
    ) {
      const item = await prisma.item.findUnique({ where: { plaidItemId: body.item_id } });
      if (item) {
        syncItem(item.id).catch((err) => app.log.error(err, 'webhook sync failed'));
      }
    }
    return { ok: true };
  });
}
