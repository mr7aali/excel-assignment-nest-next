import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/transactions' })
  path!: string;

  @ApiPropertyOptional({
    example: ['amount must not be less than 0.01'],
    description: 'Additional error details.',
  })
  error?: string | string[] | Record<string, unknown>;
}

export class AccountResourceDto {
  @ApiProperty({ example: 'cm9x4f4r20000t6xyd4x9mk3w' })
  id!: string;

  @ApiProperty({ example: 'ACC1001' })
  accountId!: string;

  @ApiProperty({ example: 'John Doe' })
  holderName!: string;

  @ApiProperty({ example: 1000 })
  balance!: number;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  createdAt!: string | Date;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  updatedAt!: string | Date;
}

export class TransactionResourceDto {
  @ApiProperty({ example: 'cm9x4m4yx0006t6xy9r5pcx9u' })
  id!: string;

  @ApiProperty({ example: 'cm9x4m4yx0007t6xyuimvla8c' })
  txId!: string;

  @ApiProperty({
    enum: ['deposit', 'withdraw', 'transfer'],
    example: 'transfer',
  })
  type!: string;

  @ApiProperty({ enum: ['pending', 'success', 'failed'], example: 'success' })
  status!: string;

  @ApiProperty({ example: 250 })
  amount!: number;

  @ApiPropertyOptional({ example: 'Salary payout' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'transfer-acc1001-acc1002-1' })
  idempotencyKey?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  failureReason?: string | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  fromVersionBefore?: number | null;

  @ApiPropertyOptional({ example: 5, nullable: true })
  fromVersionAfter?: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  toVersionBefore?: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  toVersionAfter?: number | null;

  @ApiPropertyOptional({ example: 750, nullable: true })
  fromBalanceBefore?: number | null;

  @ApiPropertyOptional({ example: 500, nullable: true })
  fromBalanceAfter?: number | null;

  @ApiPropertyOptional({ example: 1000, nullable: true })
  toBalanceBefore?: number | null;

  @ApiPropertyOptional({ example: 1250, nullable: true })
  toBalanceAfter?: number | null;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  createdAt!: string | Date;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  updatedAt!: string | Date;

  @ApiPropertyOptional({
    type: () => AccountResourceDto,
    nullable: true,
  })
  fromAccount?: AccountResourceDto | null;

  @ApiPropertyOptional({
    type: () => AccountResourceDto,
    nullable: true,
  })
  toAccount?: AccountResourceDto | null;

  @ApiProperty({ example: true })
  success!: boolean;
}

export class AccountResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 201 })
  statusCode!: number;

  @ApiProperty({ example: 'Request successful' })
  message!: string;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/accounts' })
  path!: string;

  @ApiProperty({ type: () => AccountResourceDto })
  data!: AccountResourceDto;
}

export class AccountListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Request successful' })
  message!: string;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/accounts' })
  path!: string;

  @ApiProperty({ type: () => [AccountResourceDto] })
  data!: AccountResourceDto[];
}

export class TransactionResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 201 })
  statusCode!: number;

  @ApiProperty({ example: 'Request successful' })
  message!: string;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/transactions' })
  path!: string;

  @ApiProperty({ type: () => TransactionResourceDto })
  data!: TransactionResourceDto;
}

export class TransactionListResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Request successful' })
  message!: string;

  @ApiProperty({ example: '2026-04-10T10:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/transactions' })
  path!: string;

  @ApiProperty({ type: () => [TransactionResourceDto] })
  data!: TransactionResourceDto[];
}
