import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { StockRequest, StockResponse } from './stock.interface';
import { StockStore } from './stock.store';

@Controller()
export class StockController {
  constructor(private readonly store: StockStore) {}

  @GrpcMethod('StockService', 'CheckAndReserve')
  checkAndReserve(data: StockRequest): StockResponse {
    const productId = Number(data.productId);
    const quantity = Number(data.quantity);
    const current = this.store.getStock(productId);

    if (current <= 0) {
      return { available: false, message: `Product ${productId} not found in stock` };
    }

    if (current < quantity) {
      return {
        available: false,
        message: `Insufficient stock for product ${productId}: requested ${quantity}, available ${current}`,
      };
    }

    this.store.reserve(productId, quantity);
    return {
      available: true,
      message: `Reserved ${quantity} unit(s) of product ${productId}. Remaining: ${current - quantity}`,
    };
  }
}
