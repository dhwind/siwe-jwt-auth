import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '@/modules/main/user/user.service';
import { SignInDTO } from './dto/sign-in.dto';
import { User } from 'generated/prisma';
import * as ethers from 'ethers';
import * as siwe from 'siwe';
import { AuthorizedUserProfileService } from '../smart-contracts/authorized-user-profile/authorized-user-profile.service';
import { RedisService } from '@/modules/common/redis/redis.service';

jest.mock('ethers');
jest.mock('siwe');

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService: jest.Mocked<UserService>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockAuthorizedUserProfileService: jest.Mocked<AuthorizedUserProfileService>;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockUser: User = {
    id: 'test-user-id',
    publicAddress: '0x1234567890abcdef',
    nonce: 'test-nonce',
    username: 'test-user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Mock Logger static methods to suppress logs during tests
    jest.spyOn(Logger, 'log').mockImplementation();
    jest.spyOn(Logger, 'error').mockImplementation();
    jest.spyOn(Logger, 'warn').mockImplementation();
    jest.spyOn(Logger, 'debug').mockImplementation();

    mockUserService = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const configMap: Record<string, string | number> = {
          'jwt.accessSecret': 'access-secret',
          'jwt.refreshSecret': 'refresh-secret',
          'jwt.accessExpiresIn': 3600000,
          'jwt.refreshExpiresIn': 7200000,
        };
        return configMap[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockAuthorizedUserProfileService = {
      addJwtToContract: jest.fn(),
      updateUsername: jest.fn(),
    } as unknown as jest.Mocked<AuthorizedUserProfileService>;

    mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthorizedUserProfileService,
          useValue: mockAuthorizedUserProfileService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getNonce', () => {
    const mockGenerateNonce = siwe.generateNonce as jest.Mock;
    const mockIsAddress = ethers.isAddress as unknown as jest.Mock;

    it('should throw error for invalid address', async () => {
      const inputAddress = 'invalid-address';
      mockIsAddress.mockReturnValue(false);

      await expect(service.getNonce(inputAddress)).rejects.toThrow(
        new HttpException('Invalid address', HttpStatus.BAD_REQUEST)
      );

      expect(mockIsAddress).toHaveBeenCalledTimes(1);
      expect(mockIsAddress).toHaveBeenCalledWith(inputAddress);
      expect(mockUserService.findUnique).not.toHaveBeenCalled();
    });

    it('should create new user with nonce when user does not exist', async () => {
      const inputAddress = '0x1234567890abcdef';
      const mockNonce = 'generated-nonce';
      mockIsAddress.mockReturnValue(true);
      mockGenerateNonce.mockReturnValue(mockNonce);
      mockUserService.findUnique.mockResolvedValue(null);
      const expectedUser = {
        ...mockUser,
        publicAddress: inputAddress,
        nonce: mockNonce,
      };
      mockUserService.create.mockResolvedValue(expectedUser);

      const actualResult = await service.getNonce(inputAddress);

      expect(mockIsAddress).toHaveBeenCalledWith(inputAddress);
      expect(mockUserService.findUnique).toHaveBeenCalledTimes(1);
      expect(mockUserService.findUnique).toHaveBeenCalledWith({
        publicAddress: inputAddress,
      });
      expect(mockUserService.create).toHaveBeenCalledTimes(1);
      expect(mockUserService.create).toHaveBeenCalledWith({
        publicAddress: inputAddress,
        username: `user-${inputAddress}`,
        nonce: mockNonce,
      });
      expect(mockUserService.update).not.toHaveBeenCalled();
      expect(actualResult).toEqual({
        nonce: mockNonce,
        address: inputAddress,
      });
    });

    it('should update existing user with new nonce when user exists', async () => {
      const inputAddress = '0x1234567890abcdef';
      const mockNonce = 'new-generated-nonce';
      mockIsAddress.mockReturnValue(true);
      mockGenerateNonce.mockReturnValue(mockNonce);
      mockUserService.findUnique.mockResolvedValue(mockUser);
      const expectedUser = { ...mockUser, nonce: mockNonce };
      mockUserService.update.mockResolvedValue(expectedUser);

      const actualResult = await service.getNonce(inputAddress);

      expect(mockIsAddress).toHaveBeenCalledWith(inputAddress);
      expect(mockUserService.findUnique).toHaveBeenCalledTimes(1);
      expect(mockUserService.findUnique).toHaveBeenCalledWith({
        publicAddress: inputAddress,
      });
      expect(mockUserService.update).toHaveBeenCalledTimes(1);
      expect(mockUserService.update).toHaveBeenCalledWith({
        where: { publicAddress: inputAddress },
        data: { nonce: mockNonce },
      });
      expect(mockUserService.create).not.toHaveBeenCalled();
      expect(actualResult).toEqual({
        nonce: mockNonce,
        address: mockUser.publicAddress,
      });
    });
  });

  describe('signIn', () => {
    const mockIsAddress = ethers.isAddress as unknown as jest.Mock;
    const mockGenerateNonce = siwe.generateNonce as jest.Mock;
    const mockSiweMessage = siwe.SiweMessage as jest.Mock;

    it('should throw error for invalid SIWE message', async () => {
      const inputDto: SignInDTO = {
        message: 'invalid-siwe-message',
        signature: 'test-signature',
        nonce: 'test-nonce',
      };
      mockSiweMessage.mockImplementation(() => {
        throw new Error('Invalid message');
      });

      await expect(service.signIn(inputDto)).rejects.toThrow(
        new HttpException('Invalid SIWE message', HttpStatus.BAD_REQUEST)
      );

      expect(mockSiweMessage).toHaveBeenCalledTimes(1);
      expect(mockSiweMessage).toHaveBeenCalledWith(inputDto.message);
    });

    it('should throw error for invalid address', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'test-signature',
        nonce: 'test-nonce',
      };
      const mockAddress = 'invalid-address';
      mockSiweMessage.mockImplementation(() => ({
        address: mockAddress,
      }));
      mockIsAddress.mockReturnValue(false);

      await expect(service.signIn(inputDto)).rejects.toThrow(
        new HttpException('Address is not valid!', HttpStatus.BAD_REQUEST)
      );

      expect(mockSiweMessage).toHaveBeenCalledWith(inputDto.message);
      expect(mockIsAddress).toHaveBeenCalledWith(mockAddress);
      expect(mockUserService.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'test-signature',
        nonce: 'test-nonce',
      };
      const mockAddress = '0x1234567890abcdef';
      mockSiweMessage.mockImplementation(() => ({
        address: mockAddress,
      }));
      mockIsAddress.mockReturnValue(true);
      mockUserService.findUnique.mockResolvedValue(null);

      await expect(service.signIn(inputDto)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.BAD_REQUEST)
      );

      expect(mockUserService.findUnique).toHaveBeenCalledTimes(1);
      expect(mockUserService.findUnique).toHaveBeenCalledWith({
        publicAddress: mockAddress,
      });
    });

    it('should throw error for nonce mismatch', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'test-signature',
        nonce: 'wrong-nonce',
      };
      const mockAddress = '0x1234567890abcdef';
      mockSiweMessage.mockImplementation(() => ({
        address: mockAddress,
      }));
      mockIsAddress.mockReturnValue(true);
      mockUserService.findUnique.mockResolvedValue(mockUser);

      await expect(service.signIn(inputDto)).rejects.toThrow(
        new HttpException('Invalid nonce', HttpStatus.UNAUTHORIZED)
      );

      expect(mockUserService.findUnique).toHaveBeenCalledWith({
        publicAddress: mockAddress,
      });
    });

    it('should throw error when signature verification fails', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'invalid-signature',
        nonce: mockUser.nonce,
      };
      const mockAddress = mockUser.publicAddress;
      const mockVerify = jest.fn().mockResolvedValue({ success: false });
      mockSiweMessage.mockImplementation(() => ({
        address: mockAddress,
        verify: mockVerify,
      }));
      mockIsAddress.mockReturnValue(true);
      mockUserService.findUnique.mockResolvedValue(mockUser);

      await expect(service.signIn(inputDto)).rejects.toThrow(
        new HttpException('SIWE verification failed', HttpStatus.UNAUTHORIZED)
      );

      expect(mockVerify).toHaveBeenCalledTimes(1);
      expect(mockVerify).toHaveBeenCalledWith({
        signature: inputDto.signature,
        nonce: mockUser.nonce,
      });
    });

    it('should successfully sign in and return tokens', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'valid-signature',
        nonce: mockUser.nonce,
      };
      const mockAddress = mockUser.publicAddress;
      const mockVerify = jest.fn().mockResolvedValue({ success: true });
      mockSiweMessage.mockImplementation(() => ({
        address: mockAddress,
        verify: mockVerify,
      }));
      mockIsAddress.mockReturnValue(true);
      mockUserService.findUnique.mockResolvedValue(mockUser);
      const mockNextNonce = 'next-nonce';
      mockGenerateNonce.mockReturnValue(mockNextNonce);
      const mockUpdatedUser = { ...mockUser, nonce: mockNextNonce };
      mockUserService.update.mockResolvedValue(mockUpdatedUser);
      const mockAccessToken = 'access-token';
      const mockRefreshToken = 'refresh-token';
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);
      mockRedisService.set.mockResolvedValue();

      const actualResult = await service.signIn(inputDto);

      expect(mockVerify).toHaveBeenCalledWith({
        signature: inputDto.signature,
        nonce: mockUser.nonce,
      });
      expect(mockUserService.update).toHaveBeenCalledTimes(1);
      expect(mockUserService.update).toHaveBeenCalledWith({
        where: { publicAddress: mockAddress },
        data: { nonce: mockNextNonce },
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { ...mockUser },
        {
          secret: 'access-secret',
          expiresIn: 3600000,
        }
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        { ...mockUser },
        {
          secret: 'refresh-secret',
          expiresIn: 7200000,
        }
      );

      // Verify Redis operations - tokens stored as values
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `access:${mockAddress}`,
        mockAccessToken,
        3600 // TTL in seconds
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `refresh:${mockAddress}`,
        mockRefreshToken,
        7200 // TTL in seconds
      );
      expect(actualResult).toEqual({
        address: mockAddress,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });

  describe('refresh', () => {
    it('should throw error for invalid refresh token', async () => {
      const inputToken = 'invalid-token';
      const mockError = new Error('Invalid token');
      mockJwtService.verifyAsync.mockRejectedValue(mockError);

      await expect(service.refresh(inputToken)).rejects.toThrow(
        new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED)
      );

      expect(mockJwtService.verifyAsync).toHaveBeenCalledTimes(1);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(inputToken, {
        secret: 'refresh-secret',
      });
    });

    it('should successfully refresh and return new access token', async () => {
      const inputToken = 'valid-refresh-token';
      const oldAccessToken = 'old-access-token';
      const mockDecodedToken = {
        id: mockUser.id,
        publicAddress: mockUser.publicAddress,
        nonce: mockUser.nonce,
        username: mockUser.username,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        iat: 1234567890,
        exp: 1234567999,
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedToken);
      const mockAccessToken = 'new-access-token';
      mockJwtService.signAsync.mockResolvedValue(mockAccessToken);
      mockRedisService.get.mockResolvedValue(inputToken); // Stored refresh token
      mockRedisService.set.mockResolvedValue();

      const actualResult = await service.refresh(inputToken, oldAccessToken);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledTimes(1);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(inputToken, {
        secret: 'refresh-secret',
      });
      expect(mockRedisService.get).toHaveBeenCalledWith(
        `refresh:${mockUser.publicAddress}`
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(1);
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          publicAddress: mockUser.publicAddress,
          nonce: mockUser.nonce,
          username: mockUser.username,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        {
          secret: 'access-secret',
          expiresIn: 3600000,
        }
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `access:${mockUser.publicAddress}`,
        mockAccessToken,
        3600 // TTL in seconds
      );
      expect(actualResult).toEqual({
        accessToken: mockAccessToken,
      });
    });

    it('should throw error when refresh token not in Redis', async () => {
      const inputToken = 'valid-refresh-token';
      const mockDecodedToken = {
        id: mockUser.id,
        publicAddress: mockUser.publicAddress,
        iat: 1234567890,
        exp: 1234567999,
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedToken);
      mockConfigService.getOrThrow.mockReturnValueOnce('refresh-secret');
      mockRedisService.get.mockResolvedValue(null); // No token in Redis

      await expect(service.refresh(inputToken)).rejects.toThrow(
        new HttpException(
          'Refresh token not found or expired',
          HttpStatus.UNAUTHORIZED
        )
      );
    });

    it('should throw error when refresh token does not match', async () => {
      const inputToken = 'valid-refresh-token';
      const differentToken = 'different-refresh-token';
      const mockDecodedToken = {
        id: mockUser.id,
        publicAddress: mockUser.publicAddress,
        iat: 1234567890,
        exp: 1234567999,
      };
      mockJwtService.verifyAsync.mockResolvedValue(mockDecodedToken);
      mockConfigService.getOrThrow.mockReturnValueOnce('refresh-secret');
      mockRedisService.get.mockResolvedValue(differentToken); // Different token

      await expect(service.refresh(inputToken)).rejects.toThrow(
        new HttpException(
          'Refresh token not found or expired',
          HttpStatus.UNAUTHORIZED
        )
      );
    });
  });

  describe('signOut', () => {
    it('should remove both tokens from Redis', async () => {
      mockRedisService.delete.mockResolvedValue();

      await service.signOut(mockUser.publicAddress);

      expect(mockRedisService.delete).toHaveBeenCalledWith(
        `access:${mockUser.publicAddress}`,
        `refresh:${mockUser.publicAddress}`
      );
    });
  });
});
