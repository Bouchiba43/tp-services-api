import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Order {
  @Field(() => ID)
  id: number;

  @Field(() => ID)
  productId: number;

  @Field(() => Int)
  quantity: number;

  @Field()
  status: string;

  @Field()
  customerEmail: string;
}
