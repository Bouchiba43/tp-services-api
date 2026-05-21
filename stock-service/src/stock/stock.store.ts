import { Injectable } from '@nestjs/common';

@Injectable()
export class StockStore {
  // mirrors catalog-service seed data: productId -> available quantity
  private readonly inventory = new Map<number, number>([
    [1, 10], // Laptop
    [2, 50], // Mouse
    [3, 30], // Keyboard
  ]);

  getStock(productId: number): number {
    return this.inventory.get(productId) ?? 0;
  }

  reserve(productId: number, quantity: number): boolean {
    const current = this.getStock(productId);
    if (current < quantity) return false;
    this.inventory.set(productId, current - quantity);
    return true;
  }
}
