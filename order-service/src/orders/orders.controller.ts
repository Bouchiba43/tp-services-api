import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order (calls stock-service via gRPC)' })
  @ApiConflictResponse({ description: 'Insufficient stock' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders' })
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOne(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }
}
