export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  github: {
    appId: string;
    privateKey: string;
    webhookSecret: string;
    clientId?: string;
    clientSecret?: string;
  };
  gemini: {
    apiKey: string;
    defaultModel: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.API_PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: (() => {
      const raw = (process.env.GITHUB_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
      // If it already has PEM headers, use as-is
      if (raw.startsWith('-----')) return raw;
      // Otherwise wrap the raw base64 into PKCS#1 PEM format
      const lines = raw.match(/.{1,64}/g)?.join('\n') || raw;
      return `-----BEGIN RSA PRIVATE KEY-----\n${lines}\n-----END RSA PRIVATE KEY-----`;
    })(),
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    defaultModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});
