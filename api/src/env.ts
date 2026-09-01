import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_URL: z.string().url().optional(),

  APP_PASSWORD: z.string().min(1),
  COOKIE_SECRET: z.string().min(16),
  // base64-encoded 32 bytes
  ENCRYPTION_KEY: z.string().min(1),

  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  console.error('\nCopy .env.example to api/.env and fill in the values.');
  process.exit(1);
}

export const env = parsed.data;
