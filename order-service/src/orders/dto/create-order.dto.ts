import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: 'ID of the product to order' })
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ example: 2, description: 'Number of units (must be > 0)' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'client@test.com', description: 'Customer email' })
  @IsEmail()
  customerEmail: string;
}
