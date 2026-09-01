import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

export async function accountRoutes(app: FastifyInstance) {
  app.get('/api/accounts', { preHandler: requireAuth }, async () => {
    const accounts = await prisma.account.findMany({
      orderBy: [{ item: { institution: 'asc' } }, { name: 'asc' }],
      include: { item: { select: { institution: true } } },
    });
    return { accounts };
  });

  app.get('/api/meta', { preHandler: requireAuth }, async () => {
    const rows = await prisma.meta.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });
}
