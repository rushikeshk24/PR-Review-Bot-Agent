import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { QueuesModule } from './queues/queues.module';
import { GithubModule } from './github/github.module';
import { AiModule } from './ai/ai.module';
import { ReviewModule } from './review/review.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { InstallationsModule } from './installations/installations.module';
import { SettingsModule } from './settings/settings.module';
import { BillingModule } from './billing/billing.module';
import { ManualModule } from './manual/manual.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    QueuesModule,
    GithubModule,
    AiModule,
    ReviewModule,
    WebhooksModule,
    InstallationsModule,
    SettingsModule,
    BillingModule,
    ManualModule,
  ],
})
export class AppModule {}
