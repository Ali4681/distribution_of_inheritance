import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlockedHeirsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCase(caseId: string, user: AuthUser) {
    await this.assertCanAccessCase(caseId, user);

    return this.prisma.blockedHeir.findMany({
      where: { heir: { caseId } },
      include: {
        heir: { include: { member: true } },
        blockedBy: { include: { member: true } },
      },
      orderBy: { blockType: 'asc' },
    });
  }

  async findAll(user: AuthUser) {
    return this.prisma.blockedHeir.findMany({
      where:
        user.role === Role.ADMIN
          ? undefined
          : { heir: { case: { ownerId: user.id } } },
      include: {
        heir: { include: { member: true, case: true } },
        blockedBy: { include: { member: true } },
      },
      orderBy: { blockType: 'asc' },
    });
  }

  private async assertCanAccessCase(caseId: string, user: AuthUser) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { ownerId: true },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    if (user.role !== Role.ADMIN && existingCase.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this case');
    }
  }
}
