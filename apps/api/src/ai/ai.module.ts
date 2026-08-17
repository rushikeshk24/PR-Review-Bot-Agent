import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiReviewProvider } from './gemini-review.provider';
import { REVIEW_PROVIDER_TOKEN } from './review-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiReviewProvider,
    {
      provide: REVIEW_PROVIDER_TOKEN,
      useExisting: GeminiReviewProvider,
    },
  ],
  exports: [REVIEW_PROVIDER_TOKEN, GeminiReviewProvider],
})
export class AiModule {}
