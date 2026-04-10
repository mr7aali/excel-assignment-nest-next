import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({
    example: 'ACC1001',
    description: 'Unique account identifier used across the system.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^ACC[0-9A-Za-z]+$/, {
    message: 'accountId must look like ACC1001',
  })
  accountId!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Human-readable account holder name.',
  })
  @IsString()
  @IsNotEmpty()
  holderName!: string;

  @ApiPropertyOptional({
    example: 1000,
    default: 0,
    description: 'Opening balance for the account.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialBalance?: number = 0;
}
