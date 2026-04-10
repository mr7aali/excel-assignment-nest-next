import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

const ACCOUNT_ID_PATTERN = /^ACC[0-9A-Za-z]+$/;

export class CreateTransactionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(TransactionType)
  type: TransactionType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ValidateIf((dto: CreateTransactionDto) =>
    dto.type === TransactionType.WITHDRAW ||
    dto.type === TransactionType.TRANSFER,
  )
  @IsString()
  @Matches(ACCOUNT_ID_PATTERN, {
    message: 'fromAccountId must look like ACC1001',
  })
  fromAccountId?: string;

  @ValidateIf((dto: CreateTransactionDto) =>
    dto.type === TransactionType.DEPOSIT ||
    dto.type === TransactionType.TRANSFER,
  )
  @IsString()
  @Matches(ACCOUNT_ID_PATTERN, {
    message: 'toAccountId must look like ACC1001',
  })
  toAccountId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
