import { BadRequestException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { TransactionsService } from './transactions.service';

function createAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'account-db-id',
    accountId: 'ACC1001',
    holderName: 'John Doe',
    balance: new Prisma.Decimal(1000),
    version: 1,
    isActive: true,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    ...overrides,
  };
}

function createTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'transaction-db-id',
    txId: 'tx-123',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.SUCCESS,
    amount: new Prisma.Decimal(100),
    fromAccountId: null,
    toAccountId: 'account-db-id',
    fromVersionBefore: null,
    fromVersionAfter: null,
    toVersionBefore: 1,
    toVersionAfter: 2,
    fromBalanceBefore: null,
    fromBalanceAfter: null,
    toBalanceBefore: new Prisma.Decimal(1000),
    toBalanceAfter: new Prisma.Decimal(1100),
    description: 'Test transaction',
    failureReason: null,
    idempotencyKey: null,
    createdAt: new Date('2026-04-11T00:00:00.000Z'),
    updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    fromAccount: null,
    toAccount: createAccount({
      balance: new Prisma.Decimal(1100),
      version: 2,
    }),
    ...overrides,
  };
}

describe('TransactionsService', () => {
  let prisma: any;
  let realtimeGateway: any;
  let accountReadStore: any;
  let service: TransactionsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      transaction: {
        findUnique: jest.fn(),
      },
    };

    realtimeGateway = {
      emitTransactionCreated: jest.fn(),
      emitBalanceUpdated: jest.fn(),
      emitTransactionFailed: jest.fn(),
    };

    accountReadStore = {
      upsert: jest.fn(),
    };

    service = new TransactionsService(prisma, realtimeGateway, accountReadStore);
  });

  it('creates a deposit and emits realtime updates', async () => {
    const destination = createAccount();
    const storedTransaction = createTransaction();

    const tx = {
      account: {
        findUnique: jest.fn().mockResolvedValue(destination),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: storedTransaction.id }),
        findUnique: jest.fn().mockResolvedValue(storedTransaction),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.create({
      type: TransactionType.DEPOSIT,
      amount: 100,
      toAccountId: 'ACC1001',
    });

    expect(tx.account.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          version: 1,
        }),
      }),
    );
    expect(result).toMatchObject({
      type: 'deposit',
      status: 'success',
      amount: 100,
      toBalanceAfter: 1100,
      success: true,
    });
    expect(realtimeGateway.emitTransactionCreated).toHaveBeenCalledTimes(1);
    expect(realtimeGateway.emitBalanceUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-123',
        account: expect.objectContaining({
          accountId: 'ACC1001',
          balance: 1100,
          version: 2,
        }),
      }),
    );
    expect(realtimeGateway.emitTransactionFailed).not.toHaveBeenCalled();
  });

  it('records failed withdrawals for insufficient balance and emits failure event', async () => {
    const source = createAccount({
      balance: new Prisma.Decimal(50),
      version: 3,
    });
    const failedTransaction = createTransaction({
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.FAILED,
      amount: new Prisma.Decimal(200),
      fromAccountId: source.id,
      toAccountId: null,
      fromVersionBefore: 3,
      fromVersionAfter: 3,
      toVersionBefore: null,
      toVersionAfter: null,
      fromBalanceBefore: new Prisma.Decimal(50),
      fromBalanceAfter: new Prisma.Decimal(50),
      toBalanceBefore: null,
      toBalanceAfter: null,
      failureReason: 'Insufficient balance',
      fromAccount: source,
      toAccount: null,
    });

    const tx = {
      account: {
        findUnique: jest.fn().mockResolvedValue(source),
        updateMany: jest.fn(),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: failedTransaction.id }),
        findUnique: jest.fn().mockResolvedValue(failedTransaction),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(tx),
    );

    const result = await service.create({
      type: TransactionType.WITHDRAW,
      amount: 200,
      fromAccountId: 'ACC1001',
    });

    expect(tx.account.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      type: 'withdraw',
      status: 'failed',
      failureReason: 'Insufficient balance',
      success: false,
    });
    expect(realtimeGateway.emitTransactionCreated).not.toHaveBeenCalled();
    expect(realtimeGateway.emitBalanceUpdated).not.toHaveBeenCalled();
    expect(realtimeGateway.emitTransactionFailed).toHaveBeenCalledTimes(1);
  });

  it('retries retryable concurrency conflicts and eventually succeeds', async () => {
    const source = createAccount();
    const destination = createAccount({
      id: 'account-db-id-2',
      accountId: 'ACC1002',
      holderName: 'Jane Doe',
      balance: new Prisma.Decimal(500),
      version: 4,
    });
    const transferTransaction = createTransaction({
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS,
      amount: new Prisma.Decimal(125),
      fromAccountId: source.id,
      toAccountId: destination.id,
      fromVersionBefore: 1,
      fromVersionAfter: 2,
      toVersionBefore: 4,
      toVersionAfter: 5,
      fromBalanceBefore: new Prisma.Decimal(1000),
      fromBalanceAfter: new Prisma.Decimal(875),
      toBalanceBefore: new Prisma.Decimal(500),
      toBalanceAfter: new Prisma.Decimal(625),
      fromAccount: createAccount({
        balance: new Prisma.Decimal(875),
        version: 2,
      }),
      toAccount: destination,
    });

    const tx = {
      account: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce(destination),
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 }),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: transferTransaction.id }),
        findUnique: jest.fn().mockResolvedValue(transferTransaction),
      },
    };

    const retryableError: any = new Error('could not serialize access');
    retryableError.code = 'P2034';

    prisma.$transaction
      .mockRejectedValueOnce(retryableError)
      .mockImplementationOnce(async (callback: any) => callback(tx));

    const result = await service.create({
      type: TransactionType.TRANSFER,
      amount: 125,
      fromAccountId: 'ACC1001',
      toAccountId: 'ACC1002',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      type: 'transfer',
      status: 'success',
      amount: 125,
      success: true,
    });
    expect(realtimeGateway.emitTransactionCreated).toHaveBeenCalledTimes(1);
  });

  it('treats transaction start timeout errors as retryable concurrency pressure', async () => {
    const source = createAccount();
    const destination = createAccount({
      id: 'account-db-id-2',
      accountId: 'ACC1002',
      holderName: 'Jane Doe',
      balance: new Prisma.Decimal(500),
      version: 4,
    });
    const transferTransaction = createTransaction({
      type: TransactionType.TRANSFER,
      status: TransactionStatus.SUCCESS,
      amount: new Prisma.Decimal(50),
      fromAccountId: source.id,
      toAccountId: destination.id,
      fromVersionBefore: 1,
      fromVersionAfter: 2,
      toVersionBefore: 4,
      toVersionAfter: 5,
      fromBalanceBefore: new Prisma.Decimal(1000),
      fromBalanceAfter: new Prisma.Decimal(950),
      toBalanceBefore: new Prisma.Decimal(500),
      toBalanceAfter: new Prisma.Decimal(550),
      fromAccount: createAccount({
        balance: new Prisma.Decimal(950),
        version: 2,
      }),
      toAccount: createAccount({
        id: 'account-db-id-2',
        accountId: 'ACC1002',
        holderName: 'Jane Doe',
        balance: new Prisma.Decimal(550),
        version: 5,
      }),
    });

    const tx = {
      account: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(source)
          .mockResolvedValueOnce(destination),
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 }),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: transferTransaction.id }),
        findUnique: jest.fn().mockResolvedValue(transferTransaction),
      },
    };

    const timeoutError = new Error(
      'Transaction API error: Unable to start a transaction in the given time.',
    );

    prisma.$transaction
      .mockRejectedValueOnce(timeoutError)
      .mockImplementationOnce(async (callback: any) => callback(tx));

    const result = await service.create({
      type: TransactionType.TRANSFER,
      amount: 50,
      fromAccountId: 'ACC1001',
      toAccountId: 'ACC1002',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      type: 'transfer',
      status: 'success',
      amount: 50,
      success: true,
    });
  });

  it('rejects invalid same-account transfers before hitting the database', async () => {
    await expect(
      service.create({
        type: TransactionType.TRANSFER,
        amount: 10,
        fromAccountId: 'ACC1001',
        toAccountId: 'ACC1001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
