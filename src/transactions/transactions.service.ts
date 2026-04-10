import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Account,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { serializeTransaction } from '../common/serializers/banking.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';

const MAX_RETRIES = 8;

type PrismaTransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type TransactionReader = Pick<PrismaService, 'transaction'>;

type TransactionWithAccounts = Prisma.TransactionGetPayload<{
  include: {
    fromAccount: true;
    toAccount: true;
  };
}>;

type SuccessfulMutation = {
  account: Account;
  balanceBefore: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  versionBefore: number;
  versionAfter: number;
};

class RetryableConcurrencyError extends Error {
  constructor() {
    super('Concurrent account update detected');
  }
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(dto: CreateTransactionDto) {
    this.validateTransactionRequest(dto);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const transaction = await this.prisma.$transaction(
          async (tx) => {
            if (dto.idempotencyKey) {
              const existing = await this.findByIdempotencyKey(
                tx,
                dto.idempotencyKey,
              );

              if (existing) {
                return existing;
              }
            }

            switch (dto.type) {
              case TransactionType.DEPOSIT:
                return this.handleDeposit(tx, dto);
              case TransactionType.WITHDRAW:
                return this.handleWithdraw(tx, dto);
              case TransactionType.TRANSFER:
                return this.handleTransfer(tx, dto);
              default:
                throw new BadRequestException('Unsupported transaction type');
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        this.publishRealtimeEvents(transaction);
        return serializeTransaction(transaction);
      } catch (error: any) {
        if (
          dto.idempotencyKey &&
          error?.code === 'P2002' &&
          attempt < MAX_RETRIES
        ) {
          const existing = await this.findByIdempotencyKey(
            this.prisma,
            dto.idempotencyKey,
          );

          if (existing) {
            return serializeTransaction(existing);
          }
        }

        if (this.isRetryableTransactionError(error) && attempt < MAX_RETRIES) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Transaction could not be completed due to high concurrency. Please retry.',
    );
  }

  async findAll(query: ListTransactionsDto) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.accountId
          ? {
              OR: [
                {
                  fromAccount: {
                    is: {
                      accountId: query.accountId,
                    },
                  },
                },
                {
                  toAccount: {
                    is: {
                      accountId: query.accountId,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        fromAccount: true,
        toAccount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });

    return transactions.map(serializeTransaction);
  }

  async findOne(txId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txId },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return serializeTransaction(transaction);
  }

  private validateTransactionRequest(dto: CreateTransactionDto) {
    if (
      dto.type === TransactionType.DEPOSIT &&
      (!dto.toAccountId || dto.fromAccountId)
    ) {
      throw new BadRequestException(
        'Deposit requires toAccountId and must not include fromAccountId',
      );
    }

    if (
      dto.type === TransactionType.WITHDRAW &&
      (!dto.fromAccountId || dto.toAccountId)
    ) {
      throw new BadRequestException(
        'Withdraw requires fromAccountId and must not include toAccountId',
      );
    }

    if (
      dto.type === TransactionType.TRANSFER &&
      (!dto.fromAccountId || !dto.toAccountId)
    ) {
      throw new BadRequestException(
        'Transfer requires both fromAccountId and toAccountId',
      );
    }

    if (
      dto.type === TransactionType.TRANSFER &&
      dto.fromAccountId === dto.toAccountId
    ) {
      throw new BadRequestException(
        'Transfer source and destination accounts must be different',
      );
    }
  }

  private async handleDeposit(
    tx: PrismaTransactionClient,
    dto: CreateTransactionDto,
  ) {
    const amount = new Prisma.Decimal(dto.amount);
    const destination = await this.getActiveAccountByAccountId(
      tx,
      dto.toAccountId!,
    );

    const updatedDestination = await this.applyBalanceMutation(
      tx,
      destination,
      amount,
    );

    const transaction = await tx.transaction.create({
      data: {
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.SUCCESS,
        amount,
        toAccountId: destination.id,
        toVersionBefore: updatedDestination.versionBefore,
        toVersionAfter: updatedDestination.versionAfter,
        toBalanceBefore: updatedDestination.balanceBefore,
        toBalanceAfter: updatedDestination.balanceAfter,
        description: dto.description,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    return this.loadTransactionOrThrow(tx, transaction.id);
  }

  private async handleWithdraw(
    tx: PrismaTransactionClient,
    dto: CreateTransactionDto,
  ) {
    const amount = new Prisma.Decimal(dto.amount);
    const source = await this.getActiveAccountByAccountId(tx, dto.fromAccountId!);

    if (source.balance.lessThan(amount)) {
      const failedTransaction = await tx.transaction.create({
        data: {
          type: TransactionType.WITHDRAW,
          status: TransactionStatus.FAILED,
          amount,
          fromAccountId: source.id,
          fromVersionBefore: source.version,
          fromVersionAfter: source.version,
          fromBalanceBefore: source.balance,
          fromBalanceAfter: source.balance,
          description: dto.description,
          failureReason: 'Insufficient balance',
          idempotencyKey: dto.idempotencyKey,
        },
      });

      return this.loadTransactionOrThrow(tx, failedTransaction.id);
    }

    const updatedSource = await this.applyBalanceMutation(
      tx,
      source,
      amount.negated(),
    );

    const transaction = await tx.transaction.create({
      data: {
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.SUCCESS,
        amount,
        fromAccountId: source.id,
        fromVersionBefore: updatedSource.versionBefore,
        fromVersionAfter: updatedSource.versionAfter,
        fromBalanceBefore: updatedSource.balanceBefore,
        fromBalanceAfter: updatedSource.balanceAfter,
        description: dto.description,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    return this.loadTransactionOrThrow(tx, transaction.id);
  }

  private async handleTransfer(
    tx: PrismaTransactionClient,
    dto: CreateTransactionDto,
  ) {
    const amount = new Prisma.Decimal(dto.amount);
    const [source, destination] = await Promise.all([
      this.getActiveAccountByAccountId(tx, dto.fromAccountId!),
      this.getActiveAccountByAccountId(tx, dto.toAccountId!),
    ]);

    if (source.balance.lessThan(amount)) {
      const failedTransaction = await tx.transaction.create({
        data: {
          type: TransactionType.TRANSFER,
          status: TransactionStatus.FAILED,
          amount,
          fromAccountId: source.id,
          toAccountId: destination.id,
          fromVersionBefore: source.version,
          fromVersionAfter: source.version,
          toVersionBefore: destination.version,
          toVersionAfter: destination.version,
          fromBalanceBefore: source.balance,
          fromBalanceAfter: source.balance,
          toBalanceBefore: destination.balance,
          toBalanceAfter: destination.balance,
          description: dto.description,
          failureReason: 'Insufficient balance',
          idempotencyKey: dto.idempotencyKey,
        },
      });

      return this.loadTransactionOrThrow(tx, failedTransaction.id);
    }

    const updatedSource = await this.applyBalanceMutation(
      tx,
      source,
      amount.negated(),
    );
    const updatedDestination = await this.applyBalanceMutation(
      tx,
      destination,
      amount,
    );

    const transaction = await tx.transaction.create({
      data: {
        type: TransactionType.TRANSFER,
        status: TransactionStatus.SUCCESS,
        amount,
        fromAccountId: source.id,
        toAccountId: destination.id,
        fromVersionBefore: updatedSource.versionBefore,
        fromVersionAfter: updatedSource.versionAfter,
        toVersionBefore: updatedDestination.versionBefore,
        toVersionAfter: updatedDestination.versionAfter,
        fromBalanceBefore: updatedSource.balanceBefore,
        fromBalanceAfter: updatedSource.balanceAfter,
        toBalanceBefore: updatedDestination.balanceBefore,
        toBalanceAfter: updatedDestination.balanceAfter,
        description: dto.description,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    return this.loadTransactionOrThrow(tx, transaction.id);
  }

  private async getActiveAccountByAccountId(
    tx: PrismaTransactionClient,
    accountId: string,
  ) {
    const account = await tx.account.findUnique({
      where: { accountId },
    });

    if (!account || !account.isActive) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    return account;
  }

  private async applyBalanceMutation(
    tx: PrismaTransactionClient,
    account: Account,
    delta: Prisma.Decimal,
  ): Promise<SuccessfulMutation> {
    const updateResult = await tx.account.updateMany({
      where: {
        id: account.id,
        version: account.version,
        isActive: true,
      },
      data: {
        balance:
          delta.isNegative()
            ? { decrement: delta.absoluteValue() }
            : { increment: delta },
        version: { increment: 1 },
      },
    });

    if (updateResult.count !== 1) {
      throw new RetryableConcurrencyError();
    }

    return {
      account,
      balanceBefore: account.balance,
      balanceAfter: account.balance.plus(delta),
      versionBefore: account.version,
      versionAfter: account.version + 1,
    };
  }

  private async loadTransactionOrThrow(
    tx: PrismaTransactionClient,
    transactionId: string,
  ) {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private async findByIdempotencyKey(
    tx: TransactionReader,
    idempotencyKey: string,
  ) {
    return tx.transaction.findUnique({
      where: { idempotencyKey },
      include: {
        fromAccount: true,
        toAccount: true,
      },
    });
  }

  private publishRealtimeEvents(transaction: TransactionWithAccounts) {
    const payload = serializeTransaction(transaction);

    if (transaction.status === TransactionStatus.FAILED) {
      this.realtimeGateway.emitTransactionFailed(payload);
      return;
    }

    this.realtimeGateway.emitTransactionCreated(payload);

    if (payload.fromAccount) {
      this.realtimeGateway.emitBalanceUpdated({
        transactionId: payload.txId,
        account: payload.fromAccount,
      });
    }

    if (
      payload.toAccount &&
      (!payload.fromAccount || payload.toAccount.accountId !== payload.fromAccount.accountId)
    ) {
      this.realtimeGateway.emitBalanceUpdated({
        transactionId: payload.txId,
        account: payload.toAccount,
      });
    }
  }

  private isRetryableTransactionError(error: unknown) {
    return this.hasRetryableTransactionSignal(error);
  }

  private hasRetryableTransactionSignal(error: unknown): boolean {
    if (!error) {
      return false;
    }

    if (error instanceof RetryableConcurrencyError) {
      return true;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === 'P2034';
    }

    if (typeof error === 'object') {
      const record = error as {
        code?: string;
        kind?: string;
        name?: string;
        message?: string;
        cause?: unknown;
        originalError?: unknown;
      };

      if (
        record.code === 'P2034' ||
        record.code === '40001' ||
        record.kind === 'TransactionWriteConflict' ||
        record.name === 'TransactionWriteConflict' ||
        record.message === 'TransactionWriteConflict' ||
        record.message?.includes('could not serialize access') ||
        record.message?.includes('TransactionWriteConflict')
      ) {
        return true;
      }

      return (
        this.hasRetryableTransactionSignal(record.cause) ||
        this.hasRetryableTransactionSignal(record.originalError)
      );
    }

    return false;
  }
}
