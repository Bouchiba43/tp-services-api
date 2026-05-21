import { IsInt, IsNotEmpty, IsPositive, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsPositive()
  price: number;

  @IsInt()
  @Min(0)
  stock: number;
}
