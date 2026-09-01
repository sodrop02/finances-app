import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { plaidRoutes } from './routes/plaid.js';
import { accountRoutes } from './routes/accounts.js';
import { transactionRoutes } from './routes/transactions.js';
import { syncAll } from './sync.js';

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  },
});

// Tolerate empty bodies on POSTs that send `Content-Type: application/json`
// with no payload (e.g. /logout, /sync).
app.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (_req, body, done) => {
    if (!body || (body as string).trim() === '') return done(null, undefined);
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      (err as Error & { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  },
);

await app.register(cors, {
  origin: env.WEB_ORIGIN,
  credentials: true,
});
await app.register(cookie, { secret: env.COOKIE_SECRET });

// Unwrap errors from the Plaid SDK (axios) so the real reason reaches the
// client and the logs instead of a bare "status code 400". Registered before
// the route plugins so it applies to all of them.
interface PlaidErrorBody {
  error_code?: string;
  error_type?: string;
  error_message?: string;
  display_message?: string;
}
app.setErrorHandler((err, _req, reply) => {
  const axiosLike = err as {
    isAxiosError?: boolean;
    response?: { status: number; data: PlaidErrorBody };
  };
  if (axiosLike.isAxiosError && axiosLike.response) {
    const data = axiosLike.response.data ?? {};
    app.log.error({ plaid: data }, 'Plaid API error');
    return reply.code(axiosLike.response.status).send({
      error: data.display_message ?? data.error_message ?? 'Plaid request failed',
      error_code: data.error_code,
      error_type: data.error_type,
    });
  }
  app.log.error(err);
  const e = err as { statusCode?: number; message?: string };
  return reply.code(e.statusCode ?? 500).send({ error: e.message ?? 'internal error' });
});

await app.register(authRoutes);
await app.register(plaidRoutes);
await app.register(accountRoutes);
await app.register(transactionRoutes);

app.get('/api/health', async () => ({ ok: true }));

// Lightweight scheduled sync: every 6 hours while the server is running.
// (For production, prefer webhooks + a real cron/queue.)
const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(() => {
  syncAll()
    .then((r) => app.log.info({ sync: r }, 'scheduled sync done'))
    .catch((err) => app.log.error(err, 'scheduled sync failed'));
}, SIX_HOURS).unref();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
