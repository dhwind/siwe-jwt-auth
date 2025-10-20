import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDTO } from './dto/sign-in.dto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthorizedUserProfileService } from '../smart-contracts/authorized-user-profile/authorized-user-profile.service';
import { JwtService } from '@nestjs/jwt';
@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly authorizedUserProfileService: AuthorizedUserProfileService,
    private readonly jwtService: JwtService
  ) {}

  @Get('/nonce')
  async getNonce(@Res() res: Response, @Query('address') address: string) {
    const result = await this.authService.getNonce(address);
    return res.json(result);
  }

  @Post('/sign-in')
  async signIn(@Body() signInDto: SignInDTO, @Res() res: Response) {
    const payload = await this.authService.signIn(signInDto);

    res.cookie('accessToken', payload.accessToken, {
      maxAge: this.configService.get('jwt.accessExpiresIn'),
      secure: this.configService.get('isProduction'),
    });

    res.cookie('refreshToken', payload.refreshToken, {
      maxAge: this.configService.get('jwt.refreshExpiresIn'),
      secure: this.configService.get('isProduction'),
    });

    try {
      await this.authorizedUserProfileService.addJwtToContract(
        payload.address,
        payload.accessToken
      );
    } catch (e) {
      Logger.error('Failed to add JWT to contract', e);
      throw new HttpException(
        'Failed to add JWT to contract',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return res.json({
      address: payload.address,
      accessToken: payload.accessToken,
    });
  }

  @Post('/refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refreshToken'];
    const oldAccessToken = req.cookies['accessToken'];

    if (!refreshToken) {
      throw new HttpException(
        'Refresh token is not defined!',
        HttpStatus.BAD_REQUEST
      );
    }

    const payload = await this.authService.refresh(
      refreshToken,
      oldAccessToken
    );

    res.cookie('accessToken', payload.accessToken, {
      maxAge: this.configService.get('jwt.accessExpiresIn'),
      secure: this.configService.get('isProduction'),
    });

    return res.json({
      accessToken: payload.accessToken,
    });
  }

  @Post('/sign-out')
  async signOut(@Req() req: Request, @Res() res: Response) {
    try {
      // Extract user address from JWT in cookie
      const accessToken = req.cookies['accessToken'];
      if (accessToken) {
        try {
          const decoded = await this.jwtService.verifyAsync(accessToken, {
            secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
          });
          if (decoded?.publicAddress) {
            await this.authService.signOut(decoded.publicAddress);
          }
        } catch (e) {
          // Token might be expired or invalid, just clear cookies
          Logger.error('Error decoding token during sign out', e);
        }
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      return res.sendStatus(HttpStatus.NO_CONTENT);
    } catch (e) {
      throw new HttpException(
        'Failed to sign out',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
