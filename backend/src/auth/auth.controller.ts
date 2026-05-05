import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthUser } from './auth-user';
import { AuthDto, EditUserDto } from './Dto/auth.dto';
import { JwtAuthGuard } from './guard/jwt.guard';
import { UserDto } from '../users/dto/user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  signin(@Body() authBody: AuthDto) {
    return this.authService.logIn(authBody);
  }

  @Post('signup')
  signup(@Body() signupBody: UserDto) {
    return this.authService.signUp(signupBody);
  }

  @Put('edit/:id')
  @UseGuards(JwtAuthGuard)
  editDetails(
    @Param('id') id: string,
    @Body() body: EditUserDto,
    @Req() request: Request & { user: AuthUser },
  ) {
    if (!Object.keys(body).length) {
      throw new BadRequestException('No user details were provided');
    }

    return this.authService.editDetails(id, body, request.user);
  }
}
