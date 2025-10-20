import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockRedisClient = {
      set: jest.fn(),
      setex: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      quit: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    (Redis as jest.MockedClass<typeof Redis>).mockReturnValue(mockRedisClient);

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'redis.host': 'localhost',
          'redis.port': 6379,
          'redis.password': undefined,
        };
        return config[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create Redis client with correct config', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
      });
    });
  });

  describe('set', () => {
    it('should set key-value without TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('mykey', 'myvalue');

      expect(mockRedisClient.set).toHaveBeenCalledWith('mykey', 'myvalue');
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should set key-value with TTL', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('mykey', 'myvalue', 3600);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'mykey',
        3600,
        'myvalue'
      );
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException on error', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('mykey', 'myvalue')).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('get', () => {
    it('should get value by key', async () => {
      mockRedisClient.get.mockResolvedValue('myvalue');

      const result = await service.get('mykey');

      expect(result).toBe('myvalue');
      expect(mockRedisClient.get).toHaveBeenCalledWith('mykey');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw ServiceUnavailableException on error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(service.get('mykey')).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('mykey');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('mykey');
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('mykey');

      expect(result).toBe(false);
    });

    it('should throw ServiceUnavailableException on error', async () => {
      mockRedisClient.exists.mockRejectedValue(new Error('Redis error'));

      await expect(service.exists('mykey')).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('delete', () => {
    it('should delete single key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete('mykey');

      expect(mockRedisClient.del).toHaveBeenCalledWith('mykey');
    });

    it('should delete multiple keys', async () => {
      mockRedisClient.del.mockResolvedValue(3);

      await service.delete('key1', 'key2', 'key3');

      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should not call del when no keys provided', async () => {
      await service.delete();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException on error', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('mykey')).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('keys', () => {
    it('should return matching keys', async () => {
      const matchingKeys = ['user:1', 'user:2', 'user:3'];
      mockRedisClient.keys.mockResolvedValue(matchingKeys);

      const result = await service.keys('user:*');

      expect(result).toEqual(matchingKeys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
    });

    it('should return empty array when no keys match', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.keys('nonexistent:*');

      expect(result).toEqual([]);
    });

    it('should throw ServiceUnavailableException on error', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.keys('user:*')).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis client', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
