import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { GITHUB_API_BASE, GITHUB_API_VERSION, TOKEN_REFRESH_BUFFER_MS } from '@codelens/shared';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class GithubAuthService {
  private readonly logger = new Logger(GithubAuthService.name);
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly tokenCache = new Map<number, CachedToken>();

  constructor(private readonly config: ConfigService) {
    this.appId = this.config.get<string>('github.appId', '');
    this.privateKey = this.config.get<string>('github.privateKey', '');
  }

  /**
   * Generates a short-lived App JWT signed with RS256.
   * Valid for 9 minutes (max allowed by GitHub is 10 minutes).
   */
  public generateAppJwt(): string {
    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App ID and Private Key must be configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 60s in the past for clock drift
      exp: now + 9 * 60,
      iss: this.appId,
    };

    return jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  /**
   * Exchanges App JWT for an Installation Access Token (`ghs_...`).
   * Tokens are cached and refreshed before expiry.
   */
  public async getInstallationToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    const now = Date.now();

    if (cached && cached.expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
      return cached.token;
    }

    const appJwt = this.generateAppJwt();

    const response = await fetch(
      `${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Failed to acquire installation token for installation ${installationId}: [${response.status}] ${errorText}`
      );
      throw new Error(`Failed to get installation token: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      token: string;
      expires_at: string;
      permissions: Record<string, string>;
    };

    const expiresAt = new Date(data.expires_at).getTime();
    this.tokenCache.set(installationId, {
      token: data.token,
      expiresAt,
    });

    return data.token;
  }
}
