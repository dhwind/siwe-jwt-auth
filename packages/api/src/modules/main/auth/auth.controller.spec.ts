import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignInDTO } from './dto/sign-in.dto';
import { Response, Request } from 'express';
import { AuthorizedUserProfileService } from '../smart-contracts/authorized-user-profile/authorized-user-profile.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockAuthorizedUserProfileService: jest.Mocked<AuthorizedUserProfileService>;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    // Mock Logger static methods to suppress logs during tests
    jest.spyOn(Logger, 'log').mockImplementation();
    jest.spyOn(Logger, 'error').mockImplementation();
    jest.spyOn(Logger, 'warn').mockImplementation();
    jest.spyOn(Logger, 'debug').mockImplementation();

    mockAuthService = {
      getNonce: jest.fn(),
      signIn: jest.fn(),
      refresh: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    mockAuthorizedUserProfileService = {
      addJwtToContract: jest.fn(),
      updateUsername: jest.fn(),
    } as unknown as jest.Mocked<AuthorizedUserProfileService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthorizedUserProfileService,
          useValue: mockAuthorizedUserProfileService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    // Setup mock response
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
    };

    // Setup mock request
    mockRequest = {
      cookies: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getNonce', () => {
    it('should return nonce and address for valid address', async () => {
      const inputAddress = '0x1234567890abcdef';
      const expectedResult = {
        nonce: 'generated-nonce',
        address: inputAddress,
      };
      mockAuthService.getNonce.mockResolvedValue(expectedResult);

      await controller.getNonce(mockResponse as Response, inputAddress);

      expect(mockAuthService.getNonce).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getNonce).toHaveBeenCalledWith(inputAddress);
      expect(mockResponse.json).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should throw error when AuthService throws error', async () => {
      const inputAddress = 'invalid-address';
      const expectedError = new HttpException(
        'Invalid address',
        HttpStatus.BAD_REQUEST
      );
      mockAuthService.getNonce.mockRejectedValue(expectedError);

      await expect(
        controller.getNonce(mockResponse as Response, inputAddress)
      ).rejects.toThrow(expectedError);

      expect(mockAuthService.getNonce).toHaveBeenCalledWith(inputAddress);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully, set cookies, add JWT to contract, and return access token', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'valid-signature',
        nonce: 'test-nonce',
      };
      const mockPayload = {
        address: '0x1234567890abcdef',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      const mockAccessExpiresIn = 3600000; // 1 hour in ms
      const mockRefreshExpiresIn = 86400000; // 24 hours in ms
      const mockIsProduction = false;

      mockAuthService.signIn.mockResolvedValue(mockPayload);
      mockAuthorizedUserProfileService.addJwtToContract.mockResolvedValue(
        undefined
      );
      mockConfigService.get
        .mockReturnValueOnce(mockAccessExpiresIn)
        .mockReturnValueOnce(mockIsProduction)
        .mockReturnValueOnce(mockRefreshExpiresIn)
        .mockReturnValueOnce(mockIsProduction);

      await controller.signIn(inputDto, mockResponse as Response);

      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthService.signIn).toHaveBeenCalledWith(inputDto);

      expect(
        mockAuthorizedUserProfileService.addJwtToContract
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuthorizedUserProfileService.addJwtToContract
      ).toHaveBeenCalledWith(mockPayload.address, mockPayload.accessToken);

      expect(mockConfigService.get).toHaveBeenCalledTimes(4);
      expect(mockConfigService.get).toHaveBeenNthCalledWith(
        1,
        'jwt.accessExpiresIn'
      );
      expect(mockConfigService.get).toHaveBeenNthCalledWith(2, 'isProduction');
      expect(mockConfigService.get).toHaveBeenNthCalledWith(
        3,
        'jwt.refreshExpiresIn'
      );
      expect(mockConfigService.get).toHaveBeenNthCalledWith(4, 'isProduction');

      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenNthCalledWith(
        1,
        'accessToken',
        mockPayload.accessToken,
        {
          maxAge: mockAccessExpiresIn,
          secure: mockIsProduction,
        }
      );
      expect(mockResponse.cookie).toHaveBeenNthCalledWith(
        2,
        'refreshToken',
        mockPayload.refreshToken,
        {
          maxAge: mockRefreshExpiresIn,
          secure: mockIsProduction,
        }
      );

      expect(mockResponse.json).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        address: mockPayload.address,
        accessToken: mockPayload.accessToken,
      });
    });

    it('should set secure cookies in production', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'valid-signature',
        nonce: 'test-nonce',
      };
      const mockPayload = {
        address: '0x1234567890abcdef',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      const mockIsProduction = true;

      mockAuthService.signIn.mockResolvedValue(mockPayload);
      mockAuthorizedUserProfileService.addJwtToContract.mockResolvedValue(
        undefined
      );
      mockConfigService.get
        .mockReturnValueOnce(3600000)
        .mockReturnValueOnce(mockIsProduction)
        .mockReturnValueOnce(86400000)
        .mockReturnValueOnce(mockIsProduction);

      await controller.signIn(inputDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenNthCalledWith(
        1,
        'accessToken',
        mockPayload.accessToken,
        {
          maxAge: 3600000,
          secure: true,
        }
      );
      expect(mockResponse.cookie).toHaveBeenNthCalledWith(
        2,
        'refreshToken',
        mockPayload.refreshToken,
        {
          maxAge: 86400000,
          secure: true,
        }
      );
    });

    it('should throw error when adding JWT to contract fails', async () => {
      const inputDto: SignInDTO = {
        message: 'valid-siwe-message',
        signature: 'valid-signature',
        nonce: 'test-nonce',
      };
      const mockPayload = {
        address: '0x1234567890abcdef',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      const expectedError = new Error('Contract error');

      mockAuthService.signIn.mockResolvedValue(mockPayload);
      mockAuthorizedUserProfileService.addJwtToContract.mockRejectedValue(
        expectedError
      );
      mockConfigService.get
        .mockReturnValueOnce(3600000)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(86400000)
        .mockReturnValueOnce(false);

      await expect(
        controller.signIn(inputDto, mockResponse as Response)
      ).rejects.toThrow(
        new HttpException(
          'Failed to add JWT to contract',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );

      expect(mockAuthService.signIn).toHaveBeenCalledWith(inputDto);
      expect(
        mockAuthorizedUserProfileService.addJwtToContract
      ).toHaveBeenCalledWith(mockPayload.address, mockPayload.accessToken);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should throw error when AuthService throws error', async () => {
      const inputDto: SignInDTO = {
        message: 'invalid-siwe-message',
        signature: 'invalid-signature',
        nonce: 'test-nonce',
      };
      const expectedError = new HttpException(
        'Invalid SIWE message',
        HttpStatus.BAD_REQUEST
      );
      mockAuthService.signIn.mockRejectedValue(expectedError);

      await expect(
        controller.signIn(inputDto, mockResponse as Response)
      ).rejects.toThrow(expectedError);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(inputDto);
      expect(
        mockAuthorizedUserProfileService.addJwtToContract
      ).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully and set new access token cookie', async () => {
      const mockRefreshToken = 'valid-refresh-token';
      const mockPayload = {
        accessToken: 'new-access-token',
      };
      const mockAccessExpiresIn = 3600000;
      const mockIsProduction = false;

      mockRequest.cookies = { refreshToken: mockRefreshToken };
      mockAuthService.refresh.mockResolvedValue(mockPayload);
      mockConfigService.get
        .mockReturnValueOnce(mockAccessExpiresIn)
        .mockReturnValueOnce(mockIsProduction);

      await controller.refresh(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthService.refresh).toHaveBeenCalledTimes(1);
      expect(mockAuthService.refresh).toHaveBeenCalledWith(mockRefreshToken);

      expect(mockConfigService.get).toHaveBeenCalledTimes(2);
      expect(mockConfigService.get).toHaveBeenNthCalledWith(
        1,
        'jwt.accessExpiresIn'
      );
      expect(mockConfigService.get).toHaveBeenNthCalledWith(2, 'isProduction');

      expect(mockResponse.cookie).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        mockPayload.accessToken,
        {
          maxAge: mockAccessExpiresIn,
          secure: mockIsProduction,
        }
      );

      expect(mockResponse.json).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: mockPayload.accessToken,
      });
    });

    it('should throw error when refresh token is not in cookies', async () => {
      mockRequest.cookies = {};

      await expect(
        controller.refresh(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(
        new HttpException(
          'Refresh token is not defined!',
          HttpStatus.BAD_REQUEST
        )
      );

      expect(mockAuthService.refresh).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should throw error when AuthService throws error', async () => {
      const mockRefreshToken = 'invalid-refresh-token';
      const expectedError = new HttpException(
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED
      );

      mockRequest.cookies = { refreshToken: mockRefreshToken };
      mockAuthService.refresh.mockRejectedValue(expectedError);

      await expect(
        controller.refresh(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(expectedError);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(mockRefreshToken);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should clear cookies and return NO_CONTENT status', async () => {
      await controller.signOut(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
        1,
        'accessToken'
      );
      expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
        2,
        'refreshToken'
      );

      expect(mockResponse.sendStatus).toHaveBeenCalledTimes(1);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(
        HttpStatus.NO_CONTENT
      );
    });

    it('should throw error when clearing cookies fails', async () => {
      const expectedError = new Error('Cookie clear failed');
      mockResponse.clearCookie = jest.fn().mockImplementation(() => {
        throw expectedError;
      });

      await expect(
        controller.signOut(mockResponse as Response)
      ).rejects.toThrow(
        new HttpException(
          'Failed to sign out',
          HttpStatus.INTERNAL_SERVER_ERROR
        )
      );

      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
    });
  });
});
