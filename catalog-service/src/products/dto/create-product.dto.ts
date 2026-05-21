import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1200, description: 'Unit price (must be > 0)' })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 10, description: 'Available stock (>= 0)' })
  @IsInt()
  @Min(0)
  stock: number;
}
