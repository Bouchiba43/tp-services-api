import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockStore } from './stock.store';

@Module({
  controllers: [StockController],
  providers: [StockStore],
})
export class StockModule {}
