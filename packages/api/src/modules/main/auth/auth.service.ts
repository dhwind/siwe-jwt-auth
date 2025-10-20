import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserService } from '@/modules/main/user/user.service';
import { ethers } from 'ethers';
import { generateNonce, SiweMessage, SiweResponse } from 'siwe';
import { SignInDTO } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/modules/common/redis/redis.service';

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtAccessExpiresIn: number;
  private readonly jwtRefreshExpiresIn: number;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {
    // Cache configuration values to avoid repeated lookups
    this.jwtAccessSecret =
      this.configService.getOrThrow<string>('jwt.accessSecret');
    this.jwtRefreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');
    this.jwtAccessExpiresIn = this.configService.getOrThrow<number>(
      'jwt.accessExpiresIn'
    );
    this.jwtRefreshExpiresIn = this.configService.getOrThrow<number>(
      'jwt.refreshExpiresIn'
    );
  }

  private generateNonce() {
    return generateNonce();
  }

  private getTokenKey(
    type: 'access' | 'refresh',
    publicAddress: string
  ): string {
    return `${type}:${publicAddress}`;
  }

  private async storeToken(
    type: 'access' | 'refresh',
    publicAddress: string,
    token: string,
    ttl: number
  ): Promise<void> {
    const ttlSeconds = Math.floor(ttl / 1000);
    await this.redisService.set(
      this.getTokenKey(type, publicAddress),
      token,
      ttlSeconds
    );
  }

  private checkIfAddressIsValid(address: string) {
    return ethers.isAddress(address);
  }

  async getNonce(address: string) {
    if (!this.checkIfAddressIsValid(address)) {
      throw new HttpException('Invalid address', HttpStatus.BAD_REQUEST);
    }

    let user = await this.userService.findUnique({
      publicAddress: address,
    });

    const nonce = this.generateNonce();

    if (!user) {
      // Create new user with nonce
      user = await this.userService.create({
        publicAddress: address,
        username: `user-${address}`,
        nonce: nonce,
      });
    } else {
      // Update existing user with new nonce
      user = await this.userService.update({
        where: { publicAddress: address },
        data: { nonce },
      });
    }

    return {
      nonce: user.nonce,
      address: user.publicAddress,
    };
  }

  async signIn(dto: SignInDTO) {
    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(dto.message);
    } catch (e) {
      throw new HttpException('Invalid SIWE message', HttpStatus.BAD_REQUEST);
    }

    const address = siweMessage.address;

    if (!this.checkIfAddressIsValid(address)) {
      throw new HttpException('Address is not valid!', HttpStatus.BAD_REQUEST);
    }

    let user = await this.userService.findUnique({
      publicAddress: address,
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }

    if (user.nonce !== dto.nonce) {
      throw new HttpException('Invalid nonce', HttpStatus.UNAUTHORIZED);
    }

    let verifyResult: SiweResponse | null = null;

    try {
      verifyResult = await siweMessage.verify({
        signature: dto.signature,
        nonce: user.nonce,
      });
    } catch (e) {
      throw new HttpException(
        'SIWE verification failed. Bad signature or nonce',
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!verifyResult.success) {
      throw new HttpException(
        'SIWE verification failed',
        HttpStatus.UNAUTHORIZED
      );
    }

    const nextNonce = this.generateNonce();
    await this.userService.update({
      where: { publicAddress: address },
      data: { nonce: nextNonce },
    });

    const payload = { ...user };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtAccessSecret,
        expiresIn: this.jwtAccessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshExpiresIn,
      }),
    ]);

    // Store tokens in Redis
    await Promise.all([
      this.storeToken('access', address, accessToken, this.jwtAccessExpiresIn),
      this.storeToken(
        'refresh',
        address,
        refreshToken,
        this.jwtRefreshExpiresIn
      ),
    ]);

    return {
      address,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string, oldAccessToken?: string) {
    try {
      const { iat, exp, ...decoded } = await this.jwtService.verifyAsync(
        refreshToken,
        {
          secret: this.jwtRefreshSecret,
        }
      );

      // Extract publicAddress from decoded token
      const publicAddress = decoded.publicAddress;

      if (!publicAddress) {
        throw new HttpException(
          'Invalid token payload',
          HttpStatus.UNAUTHORIZED
        );
      }

      // Validate refresh token matches the one stored in Redis
      const refreshTokenKey = this.getTokenKey('refresh', publicAddress);
      const storedRefreshToken = await this.redisService.get(refreshTokenKey);

      if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
        throw new HttpException(
          'Refresh token not found or expired',
          HttpStatus.UNAUTHORIZED
        );
      }

      // Use the user fields directly from decoded token
      const payload = { ...decoded };

      const accessToken = await this.jwtService.signAsync(payload, {
        secret: this.jwtAccessSecret,
        expiresIn: this.jwtAccessExpiresIn,
      });

      // Update access token in Redis
      await this.storeToken(
        'access',
        publicAddress,
        accessToken,
        this.jwtAccessExpiresIn
      );

      return { accessToken };
    } catch (e) {
      Logger.error(e);
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async signOut(publicAddress: string) {
    // Remove both tokens for this address
    const accessKey = this.getTokenKey('access', publicAddress);
    const refreshKey = this.getTokenKey('refresh', publicAddress);

    await this.redisService.delete(accessKey, refreshKey);
  }
}
