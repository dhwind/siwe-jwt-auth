import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/modules/main/user/user.service';
import { RedisService } from '@/modules/common/redis/redis.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly redisService: RedisService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    if (!payload || !payload.id) {
      throw new UnauthorizedException('User not found');
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const publicAddress = payload.publicAddress;

    if (!publicAddress) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Validate token matches the one stored in Redis
    const tokenKey = `access:${publicAddress}`;
    const storedToken = await this.redisService.get(tokenKey);

    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedException(
        'Token not found or expired in session store'
      );
    }

    return await this.userService.findUnique({
      id: payload.id,
    });
  }
}
