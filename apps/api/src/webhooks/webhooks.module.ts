import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { GithubWebhookGuard } from './guards/github-webhook.guard';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [ConfigModule, ReviewModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, GithubWebhookGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
