import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
    });
  }

  /**
   * Set a key-value pair with optional TTL
   * @param key - The key to set
   * @param value - The value to store
   * @param ttlSeconds - Optional TTL in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      throw new ServiceUnavailableException('Redis service unavailable');
    }
  }

  /**
   * Get a value by key
   * @param key - The key to retrieve
   * @returns The value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      throw new ServiceUnavailableException('Redis service unavailable');
    }
  }

  /**
   * Check if a key exists
   * @param key - The key to check
   * @returns True if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      throw new ServiceUnavailableException('Redis service unavailable');
    }
  }

  /**
   * Delete one or more keys
   * @param keys - The keys to delete
   */
  async delete(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      throw new ServiceUnavailableException('Redis service unavailable');
    }
  }

  /**
   * Find keys matching a pattern
   * @param pattern - The pattern to match (e.g., "user:*")
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      throw new ServiceUnavailableException('Redis service unavailable');
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
