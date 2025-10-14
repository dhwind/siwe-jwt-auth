import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '@/modules/main/user/user.service';
import { ethers } from 'ethers';
import { generateNonce, SiweMessage, SiweResponse } from 'siwe';
import { SignInDTO } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private generateNonce() {
    return generateNonce();
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
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<number>('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<number>('jwt.refreshExpiresIn'),
    });

    return {
      address,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const { iat, exp, ...decoded } = await this.jwtService.verifyAsync(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        }
      );

      // Use the user fields directly from decoded token
      const payload = { ...decoded };

      const accessToken = await this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.getOrThrow<number>('jwt.accessExpiresIn'),
      });

      return { accessToken };
    } catch (e) {
      console.log(e);
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }
}
