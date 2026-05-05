import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, Role } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { InheritanceCalculator } from './inheritance-calculator';

@Injectable()
export class HeirsService {
  private readonly calculator = new InheritanceCalculator();

  constructor(private readonly prisma: PrismaService) {}

  async calculate(caseId: string, user: AuthUser) {
    const inheritanceCase = await this.assertCanAccessCase(caseId, user);
    const members = await this.prisma.familyMember.findMany({
      where: { caseId },
      orderBy: [{ relationType: 'asc' }, { fullName: 'asc' }],
    });

    if (!members.length) {
      throw new NotFoundException(
        'Add family members before calculating inheritance',
      );
    }

    const distributableEstate = this.getDistributableEstate(inheritanceCase);
    const results = this.calculator.calculate(members, distributableEstate);
    const existingHeirs = await this.prisma.heir.findMany({
      where: { caseId },
      select: { id: true },
    });
    const existingHeirIds = existingHeirs.map((heir) => heir.id);

    const createdHeirs = await this.prisma.$transaction(async (tx) => {
      await tx.blockedHeir.deleteMany({
        where: {
          OR: [
            { heirId: { in: existingHeirIds } },
            { blockedById: { in: existingHeirIds } },
          ],
        },
      });
      await tx.heir.deleteMany({ where: { caseId } });

      const heirByMemberId = new Map<string, string>();
      let createdCount = 0;

      for (const result of results) {
        const heir = await tx.heir.create({
          data: {
            caseId,
            memberId: result.member.id,
            isEligible: result.isEligible,
            shareFraction: result.isEligible ? result.shareFraction : null,
            sharePercentage: result.isEligible ? result.share * 100 : 0,
            monetaryValue: result.isEligible
              ? result.share * distributableEstate
              : 0,
            legalBasis: result.legalBasis,
          },
          include: { member: true },
        });

        heirByMemberId.set(result.member.id, heir.id);
        createdCount += 1;
      }

      for (const result of results) {
        if (
          !result.blockedByMemberId ||
          !result.blockReason ||
          !result.blockType
        ) {
          continue;
        }

        const heirId = heirByMemberId.get(result.member.id);
        const blockedById = heirByMemberId.get(result.blockedByMemberId);
        if (!heirId || !blockedById) {
          continue;
        }

        await tx.blockedHeir.create({
          data: {
            heirId,
            blockedById,
            blockReason: result.blockReason,
            blockType: result.blockType,
          },
        });
      }

      await tx.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.CALCULATED },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          caseId,
          action: 'INHERITANCE_CALCULATED',
          changes: {
            heirs: createdCount,
            totalEstate: Number(inheritanceCase.totalEstate),
            distributableEstate,
          },
        },
      });

      return createdCount;
    });

    return this.findByCase(caseId, user, createdHeirs);
  }

  async findByCase(caseId: string, user: AuthUser, calculatedCount?: number) {
    await this.assertCanAccessCase(caseId, user);

    const heirs = await this.prisma.heir.findMany({
      where: { caseId },
      include: {
        member: true,
        blockedBy: {
          include: {
            blockedBy: { include: { member: true } },
          },
        },
      },
      orderBy: [{ isEligible: 'desc' }, { sharePercentage: 'desc' }],
    });

    return {
      status: true,
      calculatedCount,
      heirs,
      totals: this.getTotals(heirs),
    };
  }

  async findOne(id: string, user: AuthUser) {
    const heir = await this.prisma.heir.findUnique({
      where: { id },
      include: {
        case: true,
        member: true,
        blockedBy: {
          include: {
            blockedBy: { include: { member: true } },
          },
        },
      },
    });

    if (!heir) {
      throw new NotFoundException('Heir not found');
    }

    this.assertCanAccessLoadedCase(heir.case.ownerId, user);

    return heir;
  }

  async clearCase(caseId: string, user: AuthUser) {
    await this.assertCanAccessCase(caseId, user);

    const heirs = await this.prisma.heir.findMany({
      where: { caseId },
      select: { id: true },
    });
    const heirIds = heirs.map((heir) => heir.id);

    await this.prisma.$transaction([
      this.prisma.blockedHeir.deleteMany({
        where: {
          OR: [{ heirId: { in: heirIds } }, { blockedById: { in: heirIds } }],
        },
      }),
      this.prisma.heir.deleteMany({ where: { caseId } }),
      this.prisma.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.DRAFT },
      }),
    ]);

    return { status: true, message: 'Calculated heirs were cleared' };
  }

  private getTotals(
    heirs: {
      isEligible: boolean;
      sharePercentage: unknown;
      monetaryValue: unknown;
    }[],
  ) {
    return heirs.reduce(
      (totals, heir) => {
        if (!heir.isEligible) {
          totals.blocked += 1;
          return totals;
        }

        totals.eligible += 1;
        totals.sharePercentage += Number(heir.sharePercentage ?? 0);
        totals.monetaryValue += Number(heir.monetaryValue ?? 0);

        return totals;
      },
      { eligible: 0, blocked: 0, sharePercentage: 0, monetaryValue: 0 },
    );
  }

  private async assertCanAccessCase(caseId: string, user: AuthUser) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        ownerId: true,
        totalEstate: true,
        funeralCosts: true,
        debts: true,
        mandatoryWill: true,
        optionalWill: true,
      },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    this.assertCanAccessLoadedCase(existingCase.ownerId, user);

    return existingCase;
  }

  private getDistributableEstate(inheritanceCase: {
    totalEstate: unknown;
    funeralCosts: unknown;
    debts: unknown;
    mandatoryWill: unknown;
    optionalWill: unknown;
  }) {
    const distributable =
      Number(inheritanceCase.totalEstate) -
      Number(inheritanceCase.funeralCosts ?? 0) -
      Number(inheritanceCase.debts ?? 0) -
      Number(inheritanceCase.mandatoryWill ?? 0) -
      Number(inheritanceCase.optionalWill ?? 0);

    return Math.max(0, distributable);
  }

  private assertCanAccessLoadedCase(ownerId: string, user: AuthUser) {
    if (user.role !== Role.ADMIN && ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this case');
    }
  }
}
