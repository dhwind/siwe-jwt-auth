import { UserService } from '@/modules/main/user/user.service';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/modules/app.module';
import cookieParser from 'cookie-parser';
import {
  createTestWallet,
  generateSiweMessage,
  signSiweMessage,
} from './helpers/siwe-test-helper';
import request from 'supertest';

describe('UserController (e2e)', () => {
  let app: INestApplication<App>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let userService: UserService;
  let wallet = createTestWallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff59'
  );
  let address = wallet.address;
  let authTokens = {
    refreshToken: '',
    accessToken: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    consoleLogSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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

    authTokens.refreshToken = signInResponse.body.refreshToken;
    authTokens.accessToken = signInResponse.body.accessToken;
  });

  describe('/user/profile (GET)', () => {
    it('should return user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/profile')
        .set({ authorization: `Bearer ${authTokens.accessToken}` })
        .send()
        .expect(HttpStatus.OK);

      const user = await userService.findUnique({
        publicAddress: address,
      });

      expect(response.body.id).toEqual(user?.id);
      expect(response.body.publicAddress).toEqual(user?.publicAddress);
      expect(response.body.nonce).toEqual(user?.nonce);
      expect(response.body.username).toEqual(user?.username);
    });

    it('should return 401 if no access token is provided', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 if access token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .set({ authorization: `Bearer invalid-access-token` })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('/user/profile (PUT)', () => {
    it('should update user profile', async () => {
      const user = await userService.findUnique({
        publicAddress: address,
      });

      expect(user?.username).not.toEqual('test-username');

      await request(app.getHttpServer())
        .put('/user/profile')
        .set({ authorization: `Bearer ${authTokens.accessToken}` })
        .send({ username: 'test-username' })
        .expect(HttpStatus.OK);

      const updatedUser = await userService.findUnique({
        publicAddress: address,
      });

      expect(updatedUser?.username).toEqual('test-username');
    });

    it('should return 401 if no access token is provided', async () => {
      await request(app.getHttpServer())
        .put('/user/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 if access token is invalid', async () => {
      await request(app.getHttpServer())
        .put('/user/profile')
        .set({ authorization: `Bearer invalid-access-token` })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not update user profile if username is too short', async () => {
      const user = await userService.findUnique({
        publicAddress: address,
      });

      expect(user?.username).not.toEqual('t1');

      const response = await request(app.getHttpServer())
        .put('/user/profile')
        .set({ authorization: `Bearer ${authTokens.accessToken}` })
        .send({ username: 't1' })
        .expect(HttpStatus.BAD_REQUEST);

      const updatedUser = await userService.findUnique({
        publicAddress: address,
      });

      expect(updatedUser?.username).not.toEqual('t1');
      expect(response.body.message).toBeDefined();
      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });

  afterAll(async () => {
    await app.close();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    try {
      await userService.delete({
        publicAddress: address,
      });
    } catch (error) {}
  });
});
