import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ErrorResponseDto,
  TransactionListResponseDto,
  TransactionResponseDto,
} from '../common/swagger/api-doc.models';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({
    summary: 'Create a deposit, withdraw, or transfer transaction',
  })
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Validation failed or transaction rule violation.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Referenced account was not found.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'High concurrency prevented the transaction from completing.',
  })
  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }

  @ApiOperation({ summary: 'List transactions with optional filters' })
  @ApiQuery({ name: 'accountId', required: false, example: 'ACC1001' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['DEPOSIT', 'WITHDRAW', 'TRANSFER'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
  })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({ type: TransactionListResponseDto })
  @Get()
  findAll(@Query() query: ListTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one transaction by txId' })
  @ApiParam({
    name: 'txId',
    example: 'cm9x4m4yx0007t6xyuimvla8c',
  })
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Transaction not found.',
  })
  @Get(':txId')
  findOne(@Param('txId') txId: string) {
    return this.transactionsService.findOne(txId);
  }
}
