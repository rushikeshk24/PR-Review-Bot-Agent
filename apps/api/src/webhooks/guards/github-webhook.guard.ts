import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import * as crypto from 'crypto';

interface RawBodyRequest extends FastifyRequest {
  rawBody?: Buffer;
}

@Injectable()
export class GithubWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GithubWebhookGuard.name);
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.get<string>('github.webhookSecret', '');
  }

  canActivate(context: ExecutionContext): boolean {
    // If no secret configured in development, allow requests through with a warning
    if (!this.secret) {
      this.logger.warn('GITHUB_WEBHOOK_SECRET is empty. Webhook signature verification bypassed.');
      return true;
    }

    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = request.rawBody;

    if (!signature) {
      throw new UnauthorizedException('Missing X-Hub-Signature-256 header');
    }

    if (!rawBody) {
      throw new UnauthorizedException('Raw request body is missing for verification');
    }

    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      this.logger.error('Invalid webhook signature received');
      throw new UnauthorizedException('Invalid X-Hub-Signature-256 signature');
    }

    return true;
  }
}
