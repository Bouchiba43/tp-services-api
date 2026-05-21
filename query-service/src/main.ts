import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3005);
  console.log('query-service running on port 3005 — GraphQL playground at /graphql');
}

void bootstrap();
