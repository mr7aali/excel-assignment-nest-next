import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class ListTransactionsDto {
  @ApiPropertyOptional({
    example: 'ACC1001',
    description: 'Filter by transactions that involve this account.',
  })
  @IsOptional()
  @Matches(/^ACC[0-9A-Za-z]+$/, {
    message: 'accountId must look like ACC1001',
  })
  accountId?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    example: TransactionType.TRANSFER,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    example: TransactionStatus.SUCCESS,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
