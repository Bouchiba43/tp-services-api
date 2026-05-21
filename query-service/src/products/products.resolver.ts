import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { firstValueFrom } from 'rxjs';
import { Product } from './product.model';

@Injectable()
@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly http: HttpService) {}

  @Query(() => [Product], { description: 'List all products from catalog-service' })
  async products(): Promise<Product[]> {
    const { data } = await firstValueFrom(
      this.http.get<Product[]>(
        `${process.env.CATALOG_URL ?? 'http://localhost:3001'}/products`,
      ),
    );
    return data;
  }
}
