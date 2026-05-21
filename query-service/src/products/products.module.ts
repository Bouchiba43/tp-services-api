import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ProductsResolver } from './products.resolver';

@Module({
  imports: [HttpModule],
  providers: [ProductsResolver],
})
export class ProductsModule {}
