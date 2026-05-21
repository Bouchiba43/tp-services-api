export class StockRequest {
  productId: number;
  quantity: number;
}

export class StockResponse {
  available: boolean;
  message: string;
}
