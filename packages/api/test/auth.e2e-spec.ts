import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app.module';
import { TEST_NONCE } from './helpers/test-wallet';
import {
  createTestWallet,
  extractCookieValue,
  generateSiweMessage,
  signSiweMessage,
} from './helpers/siwe-test-helper';
import { UserService } from '@/modules/main/user/user.service';
import { AuthorizedUserProfileService } from '@/modules/main/smart-contracts/authorized-user-profile/authorized-user-profile.service';
import { RedisService } from '@/modules/common/redis/redis.service';
import cookieParser from 'cookie-parser';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let userService: UserService;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const wallet = createTestWallet();
  const address = wallet.address;

  // Mock the smart contract service to avoid real blockchain calls in e2e tests
  const mockAuthorizedUserProfileService = {
    addJwtToContract: jest.fn().mockResolvedValue(undefined),
    updateUsername: jest.fn().mockResolvedValue(undefined),
  };

  // Mock Redis service for e2e tests with in-memory storage
  const redisStorage = new Map<string, string>();
  const mockRedisService = {
    set: jest.fn((key: string, value: string) => {
      redisStorage.set(key, value);
      return Promise.resolve(undefined);
    }),
    get: jest.fn((key: string) => {
      return Promise.resolve(redisStorage.get(key) || null);
    }),
    delete: jest.fn((...keys: string[]) => {
      keys.forEach((key) => redisStorage.delete(key));
      return Promise.resolve(undefined);
    }),
    keys: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthorizedUserProfileService)
      .useValue(mockAuthorizedUserProfileService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock Logger static methods to suppress logs during tests
    loggerLogSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    loggerErrorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => {});
    loggerWarnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => {});
    loggerDebugSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => {});

    app = moduleFixture.createNestApplication({ logger: false });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    app.use(cookieParser());
    await app.init();

    userService = app.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerDebugSpy.mockRestore();
  });

  beforeEach(async () => {
    // Clear mock calls before each test
    jest.clearAllMocks();

    try {
      await userService.delete({
        publicAddress: address,
      });
    } catch (error) {}
  });

  describe('/auth/nonce', () => {
    it('should get nonce for valid address', async () => {
      const response = await request(app.getHttpServer())
        .get(`/auth/nonce?address=${address}`)
        .expect(HttpStatus.OK);

      expect(response.body.address).toBe(address);
    });

    it('should throw error for invalid address', () => {
      return request(app.getHttpServer())
        .get(`/auth/nonce?address=invalid-address`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should throw an error for missing address', () => {
      return request(app.getHttpServer())
        .get('/auth/nonce')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/auth/sign-in', () => {
    it('should sign in with valid SIWE message', async () => {
      const nonceResponse = await request(app.getHttpServer())
        .get('/auth/nonce')
        .query({ address });

      const { nonce } = nonceResponse.body;

      const message = generateSiweMessage(wallet, nonce);
      const signature = await signSiweMessage(wallet, message);

      const signInResponse = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          message,
          signature,
          nonce,
        });

      const cookies = signInResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const accessToken = extractCookieValue(cookies, 'accessToken');
      const refreshToken = extractCookieValue(cookies, 'refreshToken');

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(signInResponse.body.address).toBe(address);
    });

    it('should create a new user if do not exist', async () => {
      const newWallet = createTestWallet();
      const newAddress = newWallet.address;

      const userBeforeSignIn = await userService.findUnique({
        publicAddress: newAddress,
      });

      const nonceResponse = await request(app.getHttpServer())
        .get('/auth/nonce')
        .query({ address: newAddress });

      const { nonce } = nonceResponse.body;

      const message = generateSiweMessage(newWallet, nonce);
      const signature = await signSiweMessage(newWallet, message);

      const signInResponse = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          message,
          signature,
          nonce,
        });

      const newUser = await userService.findUnique({
        publicAddress: newAddress,
      });

      expect(userBeforeSignIn).toBeNull();
      expect(newUser).toBeDefined();
      expect(newUser?.nonce).not.toBe(nonce); // nonce is changed once user is logged in
      expect(newUser?.publicAddress).toBe(signInResponse.body.address);
    });

    it('should not authorize because of invalid signature', async () => {
      const nonceResponse = await request(app.getHttpServer())
        .get('/auth/nonce')
        .query({ address });

      const { nonce } = nonceResponse.body;

      const message = generateSiweMessage(wallet, nonce);
      const signature = 'fake-signature';

      const signInResponse = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          message,
          signature,
          nonce,
        });

      expect(signInResponse.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should throw an error for invalid SIWE message', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          message: 'invalid-siwe-message',
          signature: 'invalid-signature',
          nonce: TEST_NONCE,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/auth/refresh', () => {
    it('should refresh token successfully and set new access token cookie', async () => {
      const nonceResponse = await request(app.getHttpServer())
        .get('/auth/nonce')
        .query({ address });

      const { nonce } = nonceResponse.body;

      const message = generateSiweMessage(wallet, nonce);
      const signature = await signSiweMessage(wallet, message);

      const signInResponse = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          message,
          signature,
          nonce,
        });

      const cookies = signInResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const refreshToken = extractCookieValue(cookies, 'refreshToken');

      await new Promise((resolve) => setTimeout(resolve, 1000)); // if accessToken seconds and payload are the same, it will sign the exact same token

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .send()
        .expect(HttpStatus.CREATED);

      expect(refreshResponse.body.accessToken).not.toBe(
        signInResponse.body.accessToken
      );
    });

    it('should throw error for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refreshToken=invalid-token`])
        .send()
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should throw error for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send()
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('/auth/sign-out', () => {
    it('should sign out successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-out')
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});
