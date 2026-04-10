import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':txId')
  findOne(@Param('txId') txId: string) {
    return this.transactionsService.findOne(txId);
  }
}
