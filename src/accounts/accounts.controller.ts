import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  AccountListResponseDto,
  AccountResponseDto,
  ErrorResponseDto,
} from '../common/swagger/api-doc.models';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Account ID already exists.',
  })
  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @ApiOperation({ summary: 'List all accounts' })
  @ApiOkResponse({ type: AccountListResponseDto })
  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @ApiOperation({ summary: 'Get one account by accountId' })
  @ApiParam({
    name: 'accountId',
    example: 'ACC1001',
  })
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Account not found.',
  })
  @Get(':accountId')
  findOne(@Param('accountId') accountId: string) {
    return this.accountsService.findOne(accountId);
  }
}
