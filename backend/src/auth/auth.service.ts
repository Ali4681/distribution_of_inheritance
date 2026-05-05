import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { UserDto } from '../users/dto/user.dto';
import { PublicUser, UsersService } from '../users/users.service';
import { AuthUser } from './auth-user';
import { AuthDto, EditUserDto, PayloadDto } from './Dto/auth.dto';

const scryptAsync = promisify(scrypt);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async logIn(authBody: AuthDto) {
    if (!authBody.email || !authBody.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.usersService.getOneUserByEmail(authBody.email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const passwordMatches = await this.verifyPassword(
      authBody.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException();
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const payload = this.buildPayload(user);

    return {
      token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async signUp(signupBody: UserDto) {
    if (!signupBody.name || !signupBody.email || !signupBody.password) {
      throw new BadRequestException('Name, email and password are required');
    }

    const existingUser = await this.usersService.getOneUserByEmail(
      signupBody.email,
    );

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.hashPassword(signupBody.password);
    const newUser = await this.usersService.create({
      name: signupBody.name,
      email: signupBody.email,
      passwordHash,
      role: signupBody.role ?? Role.USER,
    });
    const payload = this.buildPayload(newUser);

    return {
      status: true,
      message: 'User created successfully',
      token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async editDetails(userId: string, body: EditUserDto, currentUser: AuthUser) {
    if (currentUser.id !== userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only edit your own account');
    }

    const safeBody =
      currentUser.role === Role.ADMIN
        ? body
        : { name: body.name, email: body.email };
    const updatedUser = await this.usersService.update(userId, safeBody);

    return {
      status: true,
      message: 'User updated successfully',
      user: updatedUser,
    };
  }

  generateJwt(userpayload: PayloadDto) {
    return this.jwtService.sign(userpayload);
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = (await scryptAsync(password, salt, 64)) as Buffer;

    return `scrypt:${salt}:${key.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedPassword: string) {
    const [scheme, salt, storedKey] = storedPassword.split(':');

    if (scheme !== 'scrypt' || !salt || !storedKey) {
      return false;
    }

    const key = (await scryptAsync(password, salt, 64)) as Buffer;

    return key.toString('hex') === storedKey;
  }

  private buildPayload(user: PublicUser): PayloadDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
