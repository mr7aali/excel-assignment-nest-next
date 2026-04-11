import { Module } from '@nestjs/common';
import { AccountReadStoreService } from './account-read-store.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, AccountReadStoreService],
  exports: [AccountsService, AccountReadStoreService],
})
export class AccountsModule {}
