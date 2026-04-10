import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { serializeAccount } from '../common/serializers/banking.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto) {
    try {
      const account = await this.prisma.account.create({
        data: {
          accountId: dto.accountId,
          holderName: dto.holderName,
          balance: new Prisma.Decimal(dto.initialBalance ?? 0),
        },
      });

      return serializeAccount(account);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Account ID already exists');
      }
      throw error;
    }
  }

  async findAll() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(serializeAccount);
  }

  async findOne(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return serializeAccount(account);
  }
}
