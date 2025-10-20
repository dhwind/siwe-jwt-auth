import { parseDuration } from '@/utils';
import { smartContracts } from './contracts';

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-in-production',
    accessExpiresIn: parseDuration(process.env.JWT_ACCESS_EXPIRES_IN || '1h'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  contracts: {
    authorizedUserProfile: {
      ...smartContracts.AuthorizedUserProfile,
    },
  },
});
