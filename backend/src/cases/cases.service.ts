import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, Prisma, Role } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';

type AuditChanges = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;

const caseInclude = {
  familyMembers: {
    orderBy: [{ relationType: 'asc' as const }, { fullName: 'asc' as const }],
  },
  heirs: {
    include: { member: true },
    orderBy: { calculatedAt: 'desc' as const },
  },
  reports: {
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCaseDto: CreateCaseDto, user: AuthUser) {
    const createdCase = await this.prisma.case.create({
      data: {
        ownerId: user.id,
        deceasedName: createCaseDto.deceasedName,
        deathDate: new Date(createCaseDto.deathDate),
        totalEstate: createCaseDto.totalEstate,
        funeralCosts: createCaseDto.funeralCosts ?? 0,
        debts: createCaseDto.debts ?? 0,
        mandatoryWill: createCaseDto.mandatoryWill ?? 0,
        optionalWill: createCaseDto.optionalWill ?? 0,
        currency: createCaseDto.currency ?? 'SAR',
      },
      include: caseInclude,
    });

    await this.audit(user, createdCase.id, 'CASE_CREATED', createCaseDto);

    return createdCase;
  }

  async findAll(user: AuthUser) {
    return this.prisma.case.findMany({
      where: user.role === Role.ADMIN ? undefined : { ownerId: user.id },
      include: {
        _count: {
          select: { familyMembers: true, heirs: true, reports: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    await this.assertCanAccessCase(id, user);

    return this.prisma.case.findUnique({
      where: { id },
      include: caseInclude,
    });
  }

  async update(id: string, updateCaseDto: UpdateCaseDto, user: AuthUser) {
    await this.assertCanAccessCase(id, user);

    const updatedCase = await this.prisma.case.update({
      where: { id },
      data: {
        deceasedName: updateCaseDto.deceasedName,
        deathDate: updateCaseDto.deathDate
          ? new Date(updateCaseDto.deathDate)
          : undefined,
        totalEstate: updateCaseDto.totalEstate,
        funeralCosts: updateCaseDto.funeralCosts,
        debts: updateCaseDto.debts,
        mandatoryWill: updateCaseDto.mandatoryWill,
        optionalWill: updateCaseDto.optionalWill,
        currency: updateCaseDto.currency,
      },
      include: caseInclude,
    });

    await this.audit(user, id, 'CASE_UPDATED', updateCaseDto);

    return updatedCase;
  }

  async updateStatus(id: string, status: CaseStatus, user: AuthUser) {
    await this.assertCanAccessCase(id, user);

    return this.prisma.case.update({
      where: { id },
      data: { status },
      include: caseInclude,
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.assertCanAccessCase(id, user);

    const heirs = await this.prisma.heir.findMany({
      where: { caseId: id },
      select: { id: true },
    });
    const heirIds = heirs.map((heir) => heir.id);

    await this.prisma.$transaction([
      this.prisma.blockedHeir.deleteMany({
        where: {
          OR: [{ heirId: { in: heirIds } }, { blockedById: { in: heirIds } }],
        },
      }),
      this.prisma.heir.deleteMany({ where: { caseId: id } }),
      this.prisma.auditLog.deleteMany({ where: { caseId: id } }),
      this.prisma.case.delete({ where: { id } }),
    ]);

    return { status: true, message: 'Case deleted successfully' };
  }

  async assertCanAccessCase(caseId: string, user: AuthUser) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, ownerId: true },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    if (user.role !== Role.ADMIN && existingCase.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this case');
    }

    return existingCase;
  }

  async audit(
    user: AuthUser,
    caseId: string | null,
    action: string,
    changes?: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        caseId,
        action,
        changes: this.toAuditChanges(changes),
      },
    });
  }

  private toAuditChanges(value: unknown): AuditChanges | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    const nestedJson = this.toNestedJson(value);
    return nestedJson === null ? Prisma.JsonNull : nestedJson;
  }

  private toNestedJson(value: unknown): Prisma.InputJsonValue | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : String(value);
    }

    if (
      typeof value === 'bigint' ||
      typeof value === 'symbol' ||
      typeof value === 'function'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toNestedJson(item));
    }

    if (typeof value === 'object') {
      const jsonObject: Record<string, Prisma.InputJsonValue | null> = {};

      for (const [key, item] of Object.entries(
        value as Record<string, unknown>,
      )) {
        jsonObject[key] = this.toNestedJson(item);
      }

      return jsonObject;
    }

    return null;
  }
}
