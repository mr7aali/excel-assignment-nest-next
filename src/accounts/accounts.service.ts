import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto) {
    try {
      return await this.prisma.account.create({
        data: {
          accountId: dto.accountId,
          holderName: dto.holderName,
          balance: new Prisma.Decimal(dto.initialBalance ?? 0),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Account ID already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }
}
