import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const QUEUES = {
  GITHUB_EVENTS: 'github-events',
  PR_REVIEW: 'pr-review',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password'),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUES.GITHUB_EVENTS,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 1000, age: 86400 },
        removeOnFail: { count: 5000 },
      },
    }),
    BullModule.registerQueue({
      name: QUEUES.PR_REVIEW,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: { count: 500, age: 86400 * 3 },
        removeOnFail: { count: 2000 },
      },
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
