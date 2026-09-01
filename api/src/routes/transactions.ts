import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

// Filters shared by the transaction list and the amount-bucket summary.
const listFilters = z.object({
  accountId: z.string().optional(),
  itemId: z.string().optional(), // financial institution (Plaid Item)
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  // amount range, in dollars — mirrors AMOUNT_BUCKETS below (min exclusive, max inclusive)
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  // NB: z.coerce.boolean() would turn the string "false" into true — parse explicitly
  pending: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

function buildWhere(q: z.infer<typeof listFilters>): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};
  if (q.accountId) where.accountId = q.accountId;
  if (q.itemId) where.itemId = q.itemId;
  if (q.search) where.name = { contains: q.search };
  if (q.from || q.to) {
    where.date = {
      ...(q.from ? { gte: new Date(q.from) } : {}),
      ...(q.to ? { lte: new Date(q.to) } : {}),
    };
  }
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    where.amount = {
      ...(q.minAmount !== undefined ? { gt: Math.round(q.minAmount * 100) } : {}),
      ...(q.maxAmount !== undefined ? { lte: Math.round(q.maxAmount * 100) } : {}),
    };
  }
  if (q.pending !== undefined) where.pending = q.pending;
  return where;
}

// Amount-range buckets for the spending-distribution summary, in dollars.
// `min` is exclusive, `max` is inclusive (except the top, open-ended bucket).
// Ordered smallest to largest — the frontend renders them left to right.
const AMOUNT_BUCKETS = [
  { label: '$0 – $20', min: 0, max: 20 },
  { label: '$20 – $50', min: 20, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100 – $250', min: 100, max: 250 },
  { label: '$250 – $500', min: 250, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: '$1,000+', min: 1000, max: null },
] as const;

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/api/transactions', { preHandler: requireAuth }, async (request) => {
    const q = listFilters
      .extend({
        page: z.coerce.number().min(0).default(0),
        pageSize: z.coerce.number().min(1).max(200).default(50),
        sortField: z.enum(['date', 'name', 'amount', 'category', 'pending', 'account']).default('date'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
      .parse(request.query);

    const where = buildWhere(q);

    const orderBy: Prisma.TransactionOrderByWithRelationInput =
      q.sortField === 'account'
        ? { account: { name: q.sortOrder } }
        : { [q.sortField]: q.sortOrder };

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        // secondary sort by date keeps paging stable when the primary field has ties
        orderBy: q.sortField === 'date' ? orderBy : [orderBy, { date: 'desc' }],
        skip: q.page * q.pageSize,
        take: q.pageSize,
        include: { account: { select: { name: true, mask: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { rows, total, page: q.page, pageSize: q.pageSize };
  });

  // Count + total per amount range, over whatever the transaction list is
  // currently filtered to (same accountId/search/from/to). Outflows only
  // (amount > 0, Plaid's "money left the account" convention) and non-pending,
  // matching the semantics of /api/summary.
  app.get('/api/transactions/buckets', { preHandler: requireAuth }, async (request) => {
    const q = listFilters.parse(request.query);
    const where = buildWhere(q);

    const buckets = await Promise.all(
      AMOUNT_BUCKETS.map(async (b) => {
        const bucketWhere: Prisma.TransactionWhereInput = {
          ...where,
          pending: false,
          amount: {
            gt: b.min * 100,
            ...(b.max !== null ? { lte: b.max * 100 } : {}),
          },
        };
        const agg = await prisma.transaction.aggregate({
          where: bucketWhere,
          _count: true,
          _sum: { amount: true },
        });
        return { label: b.label, min: b.min, max: b.max, count: agg._count, total: agg._sum.amount ?? 0 };
      }),
    );

    return { buckets };
  });

  // Spend-by-category for the dashboard, over the last N days.
  app.get('/api/summary', { preHandler: requireAuth }, async (request) => {
    const q = z.object({ days: z.coerce.number().min(1).max(365).default(120) }).parse(request.query);
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
