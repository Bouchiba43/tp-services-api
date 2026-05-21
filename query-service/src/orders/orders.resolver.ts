import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Order } from './order.model';

@Injectable()
@Resolver(() => Order)
export class OrdersResolver {
  constructor(private readonly http: HttpService) {}

  @Query(() => [Order], { description: 'List all orders from order-service' })
  async orders(): Promise<Order[]> {
    const { data } = await firstValueFrom(
      this.http.get<Order[]>(
        `${process.env.ORDER_URL ?? 'http://localhost:3002'}/orders`,
      ),
    );
    return data;
  }

  @Query(() => Order, { nullable: true, description: 'Get a single order by id' })
  async orderById(@Args('id', { type: () => ID }) id: string): Promise<Order | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<Order>(
          `${process.env.ORDER_URL ?? 'http://localhost:3002'}/orders/${id}`,
        ),
      );
      return data;
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 404) throw new NotFoundException(`Order ${id} not found`);
      throw err;
    }
  }
}
