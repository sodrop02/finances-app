import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/api/transactions', { preHandler: requireAuth }, async (request) => {
    const q = z
      .object({
        page: z.coerce.number().min(0).default(0),
        pageSize: z.coerce.number().min(1).max(200).default(50),
        accountId: z.string().optional(),
        search: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(request.query);

    const where: Prisma.TransactionWhereInput = {};
    if (q.accountId) where.accountId = q.accountId;
    if (q.search) where.name = { contains: q.search };
    if (q.from || q.to) {
      where.date = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: q.page * q.pageSize,
        take: q.pageSize,
        include: { account: { select: { name: true, mask: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { rows, total, page: q.page, pageSize: q.pageSize };
  });

  // Spend-by-category for the dashboard, over the last N days.
  app.get('/api/summary', { preHandler: requireAuth }, async (request) => {
    const q = z.object({ days: z.coerce.number().min(1).max(365).default(30) }).parse(request.query);
    const since = new Date();
    since.setDate(since.getDate() - q.days);

    const grouped = await prisma.transaction.groupBy({
      by: ['category'],
      where: { date: { gte: since }, amount: { gt: 0 }, pending: false },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const totalSpent = grouped.reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);

    return {
      days: q.days,
      totalSpent,
      byCategory: grouped.map((g) => ({
        category: g.category ?? 'Uncategorized',
        amount: g._sum.amount ?? 0,
      })),
    };
  });
}
