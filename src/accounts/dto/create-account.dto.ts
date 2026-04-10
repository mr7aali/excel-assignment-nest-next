import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^ACC[0-9A-Za-z]+$/, {
    message: 'accountId must look like ACC1001',
  })
  accountId: string;

  @IsString()
  @IsNotEmpty()
  holderName: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialBalance?: number = 0;
}
