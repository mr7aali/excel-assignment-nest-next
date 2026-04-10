import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { TransactionStatus, TransactionType } from '@prisma/client';

export class ListTransactionsDto {
  @IsOptional()
  @Matches(/^ACC[0-9A-Za-z]+$/, {
    message: 'accountId must look like ACC1001',
  })
  accountId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
