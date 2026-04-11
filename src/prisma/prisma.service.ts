import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';

const { Pool } = pg;

function readPositiveNumberEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function readNonNegativeNumberEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : fallback;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      max: readPositiveNumberEnv('PG_POOL_MAX', 80),
      idleTimeoutMillis: readPositiveNumberEnv('PG_IDLE_TIMEOUT_MS', 30000),
      connectionTimeoutMillis: readPositiveNumberEnv(
        'PG_CONNECTION_TIMEOUT_MS',
        15000,
      ),
    });
    const adapter = new PrismaPg(pool, {
      disposeExternalPool: true,
    });

    super({
      adapter,
      transactionOptions: {
        maxWait: readNonNegativeNumberEnv('PRISMA_TX_MAX_WAIT_MS', 8000),
        timeout: readPositiveNumberEnv('PRISMA_TX_TIMEOUT_MS', 12000),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Prisma connected to database');
    } catch (err) {
      console.error('❌ Prisma connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
