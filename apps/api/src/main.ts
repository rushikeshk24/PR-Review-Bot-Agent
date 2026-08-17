import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from '@fastify/helmet';

// Enable automatic JSON serialization for BigInt database fields
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === 'development',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      rawBody: true, // Enables req.rawBody as Buffer for Fastify webhook HMAC verification
    }
  );

  // Security & CORS
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-github-event', 'x-github-delivery', 'x-hub-signature-256'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const port = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 CodeLens AI API listening on http://0.0.0.0:${port}`);
  logger.log(`Webhook endpoint: http://0.0.0.0:${port}/webhooks/github`);
}

bootstrap();
