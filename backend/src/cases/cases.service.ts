import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, Role } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { AuditLogsService } from '../audit_logs/audit_logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';

const caseInclude = {
  properties: {
    orderBy: { createdAt: 'asc' as const },
  },
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(
    createCaseDto: CreateCaseDto,
    user: AuthUser,
    ipAddress?: string,
  ) {
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
        properties: createCaseDto.properties?.length
          ? {
              create: createCaseDto.properties.map((property) => ({
                name: property.name.trim(),
                description: property.description?.trim() || null,
                totalShares: property.totalShares ?? 2400,
              })),
            }
          : undefined,
      },
      include: caseInclude,
    });

    await this.auditLogs.record({
      userId: user.id,
      caseId: createdCase.id,
      action: 'CASE_CREATED',
      changes: createCaseDto,
      ipAddress,
    });

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

  async update(
    id: string,
    updateCaseDto: UpdateCaseDto,
    user: AuthUser,
    ipAddress?: string,
  ) {
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
        properties: updateCaseDto.properties
          ? {
              deleteMany: {},
              create: updateCaseDto.properties.map((property) => ({
                name: property.name.trim(),
                description: property.description?.trim() || null,
                totalShares: property.totalShares ?? 2400,
              })),
            }
          : undefined,
      },
      include: caseInclude,
    });

    await this.auditLogs.record({
      userId: user.id,
      caseId: id,
      action: 'CASE_UPDATED',
      changes: updateCaseDto,
      ipAddress,
    });

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

  async remove(id: string, user: AuthUser, ipAddress?: string) {
    const existingCase = await this.assertCanAccessCase(id, user);

    const heirs = await this.prisma.heir.findMany({
      where: { caseId: id },
      select: { id: true },
    });
    const heirIds = heirs.map((heir) => heir.id);

    await this.prisma.$transaction(async (tx) => {
      await this.auditLogs.record(
        {
          userId: user.id,
          caseId: null,
          action: 'CASE_DELETED',
          changes: {
            caseId: existingCase.id,
            deceasedName: existingCase.deceasedName,
            status: existingCase.status,
            totalEstate: Number(existingCase.totalEstate),
            currency: existingCase.currency,
          },
          ipAddress,
        },
        tx,
      );

      await tx.blockedHeir.deleteMany({
        where: {
          OR: [{ heirId: { in: heirIds } }, { blockedById: { in: heirIds } }],
        },
      });
      await tx.heir.deleteMany({ where: { caseId: id } });
      await this.auditLogs.detachCase(id, tx);
      await tx.case.delete({ where: { id } });
    });

    return { status: true, message: 'Case deleted successfully' };
  }

  async assertCanAccessCase(caseId: string, user: AuthUser) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        ownerId: true,
        deceasedName: true,
        totalEstate: true,
        currency: true,
        status: true,
      },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    if (user.role !== Role.ADMIN && existingCase.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this case');
    }

    return existingCase;
  }
}
