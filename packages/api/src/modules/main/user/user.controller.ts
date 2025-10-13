import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@/modules/common/guards/jwt-auth.guard';
import type { Request } from 'express';
import { UpdateUserDTO } from './dto/update-user.dto';

@Controller('/user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/profile')
  async me(@Req() req: Request) {
    return req.user;
  }

  @Put('/profile')
  async update(@Req() req: Request, @Body() body: UpdateUserDTO) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }

    return await this.userService.update({
      where: { id: req.user.id },
      data: body,
    });
  }
}
