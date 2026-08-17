import {
  Controller,
  Post,
  Headers,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GithubWebhookGuard } from './guards/github-webhook.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(GithubWebhookGuard)
  async handleGithubWebhook(
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() payload: any
  ) {
    if (!event) {
      return { acknowledged: false, message: 'Missing x-github-event header' };
    }

    // Process asynchronously & respond immediately (< 10 seconds) to satisfy GitHub
    this.webhooksService.handleEvent(event, deliveryId, payload).catch((err) => {
      this.logger.error(`Async webhook error for ${event} (${deliveryId}): ${err.message}`, err.stack);
    });

    return {
      acknowledged: true,
      event,
      deliveryId,
    };
  }
}
