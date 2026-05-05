import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';

export type PublicUser = Omit<User, 'passwordHash'>;

export type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
};

export type UpdateUserData = UpdateUserDto;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<PublicUser> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: this.normalizeEmail(data.email),
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });

    return this.toPublicUser(user);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async getOneUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async update(id: string, data: UpdateUserData): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email ? this.normalizeEmail(data.email) : undefined,
        role: data.role,
        isActive: data.isActive,
      },
    });

    return this.toPublicUser(user);
  }

  async remove(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.delete({ where: { id } });

    return this.toPublicUser(user);
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
