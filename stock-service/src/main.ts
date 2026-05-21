import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'stock',
      protoPath: join(__dirname, '../../proto/stock.proto'),
      url: '0.0.0.0:5001',
    },
  });

  await app.listen();
  console.log('stock-service gRPC listening on port 5001');
}

void bootstrap();
