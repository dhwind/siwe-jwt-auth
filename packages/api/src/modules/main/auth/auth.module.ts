import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '@/modules/main/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { AuthorizedUserProfileModule } from '../smart-contracts/authorized-user-profile/authorized-user-profile.module';

@Module({
  imports: [
    UserModule,
    ConfigModule,
    PassportModule,
    JwtModule,
    AuthorizedUserProfileModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
