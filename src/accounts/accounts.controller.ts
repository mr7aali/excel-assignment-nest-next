import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('api/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':accountId')
  findOne(@Param('accountId') accountId: string) {
    return this.accountsService.findOne(accountId);
  }
}
