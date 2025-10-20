import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '@/modules/main/user/user.service';
import { RedisService } from '@/modules/common/redis/redis.service';
import { User } from 'generated/prisma';
import { Request } from 'express';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockUser: User = {
    id: 'test-user-id',
    publicAddress: '0x1234567890abcdef',
    nonce: 'test-nonce',
    username: 'test-user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPayload = {
    id: mockUser.id,
    publicAddress: mockUser.publicAddress,
    nonce: mockUser.nonce,
    username: mockUser.username,
  };

  const mockRequest = {
    headers: {
      authorization: 'Bearer test-token',
    },
  } as Request;

  beforeEach(async () => {
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    mockUserService = {
      findUnique: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockRedisService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate and return user when token matches Redis', async () => {
      mockRedisService.get.mockResolvedValue('test-token');
      mockUserService.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockRequest, mockPayload);

      expect(mockRedisService.get).toHaveBeenCalledWith(
        `access:${mockPayload.publicAddress}`
      );
      expect(mockUserService.findUnique).toHaveBeenCalledWith({
        id: mockPayload.id,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when payload has no id', async () => {
      const invalidPayload = { publicAddress: '0xabc' };

      await expect(
        strategy.validate(mockRequest, invalidPayload)
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const requestWithoutAuth = {
        headers: {},
      } as Request;

      await expect(
        strategy.validate(requestWithoutAuth, mockPayload)
      ).rejects.toThrow(new UnauthorizedException('No authorization header'));
    });

    it('should throw UnauthorizedException when no publicAddress in payload', async () => {
      const payloadWithoutAddress = {
        id: 'test-id',
      };

      await expect(
        strategy.validate(mockRequest, payloadWithoutAddress)
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload'));
    });

    it('should throw UnauthorizedException when token not in Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException('Token not found or expired in session store')
      );

      expect(mockUserService.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token does not match', async () => {
      mockRedisService.get.mockResolvedValue('different-token');

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        new UnauthorizedException('Token not found or expired in session store')
      );

      expect(mockUserService.findUnique).not.toHaveBeenCalled();
    });
  });
});
