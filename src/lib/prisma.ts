import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function configureDatabaseUrl() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDb = '/tmp/dev.db';
    const bundledDb = path.join(process.cwd(), 'prisma', 'dev.db');

    if (!fs.existsSync(tmpDb)) {
      if (fs.existsSync(bundledDb)) {
        try {
          fs.copyFileSync(bundledDb, tmpDb);
          console.log('[Prisma] Successfully initialized /tmp/dev.db from bundled database');
        } catch (e) {
          console.error('[Prisma] Error copying to /tmp/dev.db:', e);
        }
      }
    }
    process.env.DATABASE_URL = `file:${tmpDb}`;
  } else if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
}

configureDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
