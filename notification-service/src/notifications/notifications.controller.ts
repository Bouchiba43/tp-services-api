import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

interface OrderCreatedEvent {
  orderId: number;
  productId: number;
  quantity: number;
  customerEmail: string;
  status: string;
  createdAt: string;
}

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  @EventPattern('order.created')
  handleOrderCreated(@Payload() data: OrderCreatedEvent) {
    const timestamp = new Date().toISOString();
    const payload = typeof data === 'string' ? (JSON.parse(data) as OrderCreatedEvent) : data;

    this.logger.log(
      `[${timestamp}] Confirmation sent to ${payload.customerEmail} for order ${payload.orderId}`,
    );
    this.logger.log(
      `  > product=${payload.productId}, qty=${payload.quantity}, status=${payload.status}`,
    );
  }
}
