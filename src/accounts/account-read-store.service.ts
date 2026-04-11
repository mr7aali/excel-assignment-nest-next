import { Injectable, OnModuleInit } from '@nestjs/common';
import { Account } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { serializeAccount } from '../common/serializers/banking.serializer';

type SerializedAccount = ReturnType<typeof serializeAccount>;

@Injectable()
export class AccountReadStoreService implements OnModuleInit {
  private readonly accountsById = new Map<string, SerializedAccount>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const accounts = await this.prisma.account.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          accountId: true,
          holderName: true,
          balance: true,
          version: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const account of accounts) {
        this.upsert(account);
      }
    } catch (error) {
      console.error('Failed to warm account read store', error);
    }
  }

  list() {
    return [...this.accountsById.values()].sort((left, right) =>
      right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  get(accountId: string) {
    return this.accountsById.get(accountId) ?? null;
  }

  upsert(account: Account) {
    this.accountsById.set(account.accountId, serializeAccount(account));
  }
}
