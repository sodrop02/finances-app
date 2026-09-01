import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkPassword, clearSession, isAuthed, setSession } from '../auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const body = z.object({ password: z.string() }).safeParse(request.body);
    if (!body.success || !checkPassword(body.data.password)) {
      return reply.code(401).send({ error: 'invalid password' });
    }
    setSession(reply);
    return { ok: true };
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    clearSession(reply);
    return { ok: true };
  });

  app.get('/api/auth/me', async (request) => {
    return { authenticated: isAuthed(request) };
  });
}
