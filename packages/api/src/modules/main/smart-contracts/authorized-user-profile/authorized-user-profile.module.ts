import { Module } from '@nestjs/common';
import { AuthorizedUserProfileService } from './authorized-user-profile.service';
import { ConfigModule } from '@nestjs/config';
import { UserService } from '@/modules/main/user/user.service';

@Module({
  providers: [AuthorizedUserProfileService, ConfigModule, UserService],
  exports: [AuthorizedUserProfileService],
})
export class AuthorizedUserProfileModule {}
