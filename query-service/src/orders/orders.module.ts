import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { OrdersResolver } from './orders.resolver';

@Module({
  imports: [HttpModule],
  providers: [OrdersResolver],
})
export class OrdersModule {}
