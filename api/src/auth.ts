import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from './env.js';

const COOKIE_NAME = 'session';

export function setSession(reply: FastifyReply) {
  reply.setCookie(COOKIE_NAME, 'ok', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSession(reply: FastifyReply) {
  reply.clearCookie(COOKIE_NAME, { path: '/' });
}

export function isAuthed(request: FastifyRequest): boolean {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return false;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value === 'ok';
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!isAuthed(request)) {
    reply.code(401).send({ error: 'unauthorized' });
  }
}

export function checkPassword(password: unknown): boolean {
  return typeof password === 'string' && password.length > 0 && password === env.APP_PASSWORD;
}
