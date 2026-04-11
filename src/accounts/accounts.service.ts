import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { serializeAccount } from '../common/serializers/banking.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { AccountReadStoreService } from './account-read-store.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountReadStore: AccountReadStoreService,
  ) {}

  async create(dto: CreateAccountDto) {
    try {
      const account = await this.prisma.account.create({
        data: {
          accountId: dto.accountId,
          holderName: dto.holderName,
          balance: new Prisma.Decimal(dto.initialBalance ?? 0),
        },
      });
      this.accountReadStore.upsert(account);

      return serializeAccount(account);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Account ID already exists');
      }
      throw error;
    }
  }

  async findAll() {
    const cachedAccounts = this.accountReadStore.list();
    if (cachedAccounts.length > 0) {
      return cachedAccounts;
    }

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
      this.accountReadStore.upsert(account);
    }

    return accounts.map(serializeAccount);
  }

  async findOne(accountId: string) {
    const cachedAccount = this.accountReadStore.get(accountId);
    if (cachedAccount) {
      return cachedAccount;
    }

    const account = await this.prisma.account.findUnique({
      where: { accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }
    this.accountReadStore.upsert(account);

    return serializeAccount(account);
  }
}
