import {
  ConflictException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom, Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './order.entity';

interface StockServiceGrpc {
  checkAndReserve(data: {
    productId: number;
    quantity: number;
  }): Observable<{ available: boolean; message: string }>;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private stockGrpc: StockServiceGrpc;
  private stockClient: ClientGrpc;

  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    // ClientGrpc is an interface (no runtime value) — inject as object and cast
    @Inject('STOCK_SERVICE') stockClient: object,
    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: ClientKafka,
  ) {
    this.stockClient = stockClient as ClientGrpc;
  }

  onModuleInit() {
    this.stockGrpc = this.stockClient.getService<StockServiceGrpc>('StockService');
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    const { available, message } = await firstValueFrom(
      this.stockGrpc.checkAndReserve({
        productId: dto.productId,
        quantity: dto.quantity,
      }),
    );

    if (!available) {
      throw new ConflictException(message);
    }

    const order = await this.repo.save(this.repo.create(dto));

    this.kafkaClient.emit('order.created', {
      key: String(order.id),
      value: JSON.stringify({
        orderId: order.id,
        productId: order.productId,
        quantity: order.quantity,
        customerEmail: order.customerEmail,
        status: order.status,
        createdAt: order.createdAt,
      }),
    });

    return order;
  }

  findAll(): Promise<Order[]> {
    return this.repo.find();
  }

  findOne(id: number): Promise<Order | null> {
    return this.repo.findOneBy({ id });
  }
}
