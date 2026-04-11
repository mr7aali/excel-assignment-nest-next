import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.TRANSFER,
    description: 'Transaction type to execute.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    example: 250,
    description: 'Transaction amount. Must be greater than 0.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 'ACC1001',
    description: 'Required for withdraw and transfer.',
  })
  @ValidateIf(
    (dto: CreateTransactionDto) =>
      dto.type === TransactionType.WITHDRAW ||
      dto.type === TransactionType.TRANSFER,
  )
  @IsString()
  @Matches(ACCOUNT_ID_PATTERN, {
    message: 'fromAccountId must look like ACC1001',
  })
  fromAccountId?: string;

  @ApiPropertyOptional({
    example: 'ACC1002',
    description: 'Required for deposit and transfer.',
  })
  @ValidateIf(
    (dto: CreateTransactionDto) =>
      dto.type === TransactionType.DEPOSIT ||
      dto.type === TransactionType.TRANSFER,
  )
  @IsString()
  @Matches(ACCOUNT_ID_PATTERN, {
    message: 'toAccountId must look like ACC1001',
  })
  toAccountId?: string;

  @ApiPropertyOptional({
    example: 'Invoice settlement',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'transfer-acc1001-acc1002-001',
    description: 'Optional unique key to safely retry the same request.',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
