import 'dotenv/config';
import {
  BlockType,
  CaseStatus,
  Gender,
  Language,
  PrismaClient,
  RelationType,
  ReportType,
  Role,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ids = {
  cases: {
    calculated: '10000000-0000-4000-8000-000000000001',
    draft: '10000000-0000-4000-8000-000000000002',
    closed: '10000000-0000-4000-8000-000000000003',
  },
  members: {
    wife: '20000000-0000-4000-8000-000000000001',
    mother: '20000000-0000-4000-8000-000000000002',
    sonOne: '20000000-0000-4000-8000-000000000003',
    sonTwo: '20000000-0000-4000-8000-000000000004',
    daughter: '20000000-0000-4000-8000-000000000005',
    brother: '20000000-0000-4000-8000-000000000006',
    grandson: '20000000-0000-4000-8000-000000000007',
    draftFather: '20000000-0000-4000-8000-000000000008',
    draftMother: '20000000-0000-4000-8000-000000000009',
    draftHusband: '20000000-0000-4000-8000-000000000010',
    draftDaughter: '20000000-0000-4000-8000-000000000011',
    closedHusband: '20000000-0000-4000-8000-000000000012',
    closedDaughterOne: '20000000-0000-4000-8000-000000000013',
    closedDaughterTwo: '20000000-0000-4000-8000-000000000014',
  },
  heirs: {
    wife: '30000000-0000-4000-8000-000000000001',
    mother: '30000000-0000-4000-8000-000000000002',
    sonOne: '30000000-0000-4000-8000-000000000003',
    sonTwo: '30000000-0000-4000-8000-000000000004',
    daughter: '30000000-0000-4000-8000-000000000005',
    brother: '30000000-0000-4000-8000-000000000006',
    grandson: '30000000-0000-4000-8000-000000000007',
    closedHusband: '30000000-0000-4000-8000-000000000008',
    closedDaughterOne: '30000000-0000-4000-8000-000000000009',
    closedDaughterTwo: '30000000-0000-4000-8000-000000000010',
  },
};

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${key.toString('hex')}`;
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
  const userPassword = process.env.SEED_USER_PASSWORD ?? 'User@123456';
  const inactivePassword =
    process.env.SEED_INACTIVE_PASSWORD ?? 'Inactive@123456';

  const [adminHash, userHash, inactiveHash] = await Promise.all([
    hashPassword(adminPassword),
    hashPassword(userPassword),
    hashPassword(inactivePassword),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    const caseIds = Object.values(ids.cases);

    await tx.blockedHeir.deleteMany({
      where: {
        OR: [
          { heir: { caseId: { in: caseIds } } },
          { blockedBy: { caseId: { in: caseIds } } },
        ],
      },
    });
    await tx.auditLog.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.report.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.heir.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.familyMember.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.case.deleteMany({ where: { id: { in: caseIds } } });

    const admin = await tx.user.upsert({
      where: { email: 'admin@inheritance.local' },
      update: {
        name: 'مدير النظام',
        passwordHash: adminHash,
        role: Role.ADMIN,
        isActive: true,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'مدير النظام',
        email: 'admin@inheritance.local',
        passwordHash: adminHash,
        role: Role.ADMIN,
      },
    });
    const user = await tx.user.upsert({
      where: { email: 'user@inheritance.local' },
      update: {
        name: 'أحمد محمد',
        passwordHash: userHash,
        role: Role.USER,
        isActive: true,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'أحمد محمد',
        email: 'user@inheritance.local',
        passwordHash: userHash,
        role: Role.USER,
      },
    });
    await tx.user.upsert({
      where: { email: 'inactive@inheritance.local' },
      update: {
        name: 'مستخدم غير نشط',
        passwordHash: inactiveHash,
        role: Role.USER,
        isActive: false,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'مستخدم غير نشط',
        email: 'inactive@inheritance.local',
        passwordHash: inactiveHash,
        role: Role.USER,
        isActive: false,
      },
    });

    await tx.case.createMany({
      data: [
        {
          id: ids.cases.calculated,
          ownerId: user.id,
          deceasedName: 'محمد عبد الله',
          deathDate: new Date('2026-01-15'),
          totalEstate: '1000000.00',
          funeralCosts: '20000.00',
          debts: '80000.00',
          mandatoryWill: '0.00',
          optionalWill: '50000.00',
          currency: 'SAR',
          status: CaseStatus.CALCULATED,
        },
        {
          id: ids.cases.draft,
          ownerId: user.id,
          deceasedName: 'فاطمة علي',
          deathDate: new Date('2026-05-10'),
          totalEstate: '450000.00',
          funeralCosts: '10000.00',
          debts: '25000.00',
          mandatoryWill: '0.00',
          optionalWill: '0.00',
          currency: 'SAR',
          status: CaseStatus.DRAFT,
        },
        {
          id: ids.cases.closed,
          ownerId: admin.id,
          deceasedName: 'مريم حسن',
          deathDate: new Date('2025-11-02'),
          totalEstate: '360000.00',
          funeralCosts: '6000.00',
          debts: '18000.00',
          mandatoryWill: '0.00',
          optionalWill: '0.00',
          currency: 'USD',
          status: CaseStatus.CLOSED,
        },
      ],
    });

    await tx.familyMember.createMany({
      data: [
        {
          id: ids.members.wife,
          caseId: ids.cases.calculated,
          fullName: 'سارة أحمد',
          gender: Gender.FEMALE,
          relationType: RelationType.WIFE,
          birthDate: new Date('1980-03-12'),
        },
        {
          id: ids.members.mother,
          caseId: ids.cases.calculated,
          fullName: 'خديجة محمود',
          gender: Gender.FEMALE,
          relationType: RelationType.MOTHER,
          birthDate: new Date('1950-08-20'),
        },
        {
          id: ids.members.sonOne,
          caseId: ids.cases.calculated,
          fullName: 'عبد الله محمد',
          gender: Gender.MALE,
          relationType: RelationType.SON,
          birthDate: new Date('2001-02-05'),
        },
        {
          id: ids.members.sonTwo,
          caseId: ids.cases.calculated,
          fullName: 'عمر محمد',
          gender: Gender.MALE,
          relationType: RelationType.SON,
          birthDate: new Date('2004-07-17'),
        },
        {
          id: ids.members.daughter,
          caseId: ids.cases.calculated,
          fullName: 'نور محمد',
          gender: Gender.FEMALE,
          relationType: RelationType.DAUGHTER,
          birthDate: new Date('2007-09-01'),
        },
        {
          id: ids.members.brother,
          caseId: ids.cases.calculated,
          fullName: 'يوسف عبد الله',
          gender: Gender.MALE,
          relationType: RelationType.FULL_BROTHER,
          birthDate: new Date('1978-12-10'),
        },
        {
          id: ids.members.draftFather,
          caseId: ids.cases.draft,
          fullName: 'علي صالح',
          gender: Gender.MALE,
          relationType: RelationType.FATHER,
        },
        {
          id: ids.members.draftMother,
          caseId: ids.cases.draft,
          fullName: 'أمينة خالد',
          gender: Gender.FEMALE,
          relationType: RelationType.MOTHER,
        },
        {
          id: ids.members.draftHusband,
          caseId: ids.cases.draft,
          fullName: 'سليم عمر',
          gender: Gender.MALE,
          relationType: RelationType.HUSBAND,
        },
        {
          id: ids.members.draftDaughter,
          caseId: ids.cases.draft,
          fullName: 'ريم سليم',
          gender: Gender.FEMALE,
          relationType: RelationType.DAUGHTER,
        },
        {
          id: ids.members.closedHusband,
          caseId: ids.cases.closed,
          fullName: 'حسن إبراهيم',
          gender: Gender.MALE,
          relationType: RelationType.HUSBAND,
        },
        {
          id: ids.members.closedDaughterOne,
          caseId: ids.cases.closed,
          fullName: 'ليان حسن',
          gender: Gender.FEMALE,
          relationType: RelationType.DAUGHTER,
        },
        {
          id: ids.members.closedDaughterTwo,
          caseId: ids.cases.closed,
          fullName: 'بيان حسن',
          gender: Gender.FEMALE,
          relationType: RelationType.DAUGHTER,
        },
      ],
    });
    await tx.familyMember.create({
      data: {
        id: ids.members.grandson,
        caseId: ids.cases.calculated,
        parentId: ids.members.sonOne,
        fullName: 'محمد عبد الله محمد',
        gender: Gender.MALE,
        relationType: RelationType.SON_OF_SON,
        birthDate: new Date('2023-04-14'),
      },
    });

    await tx.heir.createMany({
      data: [
        {
          id: ids.heirs.wife,
          caseId: ids.cases.calculated,
          memberId: ids.members.wife,
          isEligible: true,
          shareFraction: '1/8',
          sharePercentage: '12.500000',
          monetaryValue: '106250.00',
          legalBasis: 'للزوجة الثمن لوجود الفرع الوارث',
        },
        {
          id: ids.heirs.mother,
          caseId: ids.cases.calculated,
          memberId: ids.members.mother,
          isEligible: true,
          shareFraction: '1/6',
          sharePercentage: '16.666667',
          monetaryValue: '141666.67',
          legalBasis: 'للأم السدس لوجود الفرع الوارث',
        },
        {
          id: ids.heirs.sonOne,
          caseId: ids.cases.calculated,
          memberId: ids.members.sonOne,
          isEligible: true,
          shareFraction: '17/60',
          sharePercentage: '28.333333',
          monetaryValue: '240833.33',
          legalBasis: 'الباقي تعصيبًا للذكر مثل حظ الأنثيين',
        },
        {
          id: ids.heirs.sonTwo,
          caseId: ids.cases.calculated,
          memberId: ids.members.sonTwo,
          isEligible: true,
          shareFraction: '17/60',
          sharePercentage: '28.333333',
          monetaryValue: '240833.33',
          legalBasis: 'الباقي تعصيبًا للذكر مثل حظ الأنثيين',
        },
        {
          id: ids.heirs.daughter,
          caseId: ids.cases.calculated,
          memberId: ids.members.daughter,
          isEligible: true,
          shareFraction: '17/120',
          sharePercentage: '14.166667',
          monetaryValue: '120416.67',
          legalBasis: 'الباقي تعصيبًا مع الابن',
        },
        {
          id: ids.heirs.brother,
          caseId: ids.cases.calculated,
          memberId: ids.members.brother,
          isEligible: false,
          shareFraction: '0',
          sharePercentage: '0',
          monetaryValue: '0',
          legalBasis: 'الأخ الشقيق محجوب بالابن',
        },
        {
          id: ids.heirs.grandson,
          caseId: ids.cases.calculated,
          memberId: ids.members.grandson,
          isEligible: false,
          shareFraction: '0',
          sharePercentage: '0',
          monetaryValue: '0',
          legalBasis: 'ابن الابن محجوب بالابن الأقرب',
        },
        {
          id: ids.heirs.closedHusband,
          caseId: ids.cases.closed,
          memberId: ids.members.closedHusband,
          isEligible: true,
          shareFraction: '1/4',
          sharePercentage: '25.000000',
          monetaryValue: '84000.00',
          legalBasis: 'للزوج الربع لوجود الفرع الوارث',
        },
        {
          id: ids.heirs.closedDaughterOne,
          caseId: ids.cases.closed,
          memberId: ids.members.closedDaughterOne,
          isEligible: true,
          shareFraction: '3/8',
          sharePercentage: '37.500000',
          monetaryValue: '126000.00',
          legalBasis: 'للبنتين الثلثان فرضًا ثم الرد',
        },
        {
          id: ids.heirs.closedDaughterTwo,
          caseId: ids.cases.closed,
          memberId: ids.members.closedDaughterTwo,
          isEligible: true,
          shareFraction: '3/8',
          sharePercentage: '37.500000',
          monetaryValue: '126000.00',
          legalBasis: 'للبنتين الثلثان فرضًا ثم الرد',
        },
      ],
    });

    await tx.blockedHeir.createMany({
      data: [
        {
          id: '40000000-0000-4000-8000-000000000001',
          heirId: ids.heirs.brother,
          blockedById: ids.heirs.sonOne,
          blockReason: 'وجود الابن يحجب الأخ الشقيق حجب حرمان',
          blockType: BlockType.FULL_BLOCK,
        },
        {
          id: '40000000-0000-4000-8000-000000000002',
          heirId: ids.heirs.grandson,
          blockedById: ids.heirs.sonOne,
          blockReason: 'الابن الأقرب يحجب ابن الابن',
          blockType: BlockType.FULL_BLOCK,
        },
      ],
    });

    await tx.report.createMany({
      data: [
        {
          id: '50000000-0000-4000-8000-000000000001',
          caseId: ids.cases.calculated,
          generatedBy: user.id,
          filePath: 'reports/seed/calculated-case-ar.pdf',
          reportType: ReportType.PDF,
          language: Language.AR,
        },
        {
          id: '50000000-0000-4000-8000-000000000002',
          caseId: ids.cases.closed,
          generatedBy: admin.id,
          filePath: 'reports/seed/closed-case-summary.json',
          reportType: ReportType.SUMMARY,
          language: Language.EN,
        },
      ],
    });

    await tx.auditLog.createMany({
      data: [
        {
          id: '60000000-0000-4000-8000-000000000001',
          userId: user.id,
          caseId: ids.cases.calculated,
          action: 'CASE_CREATED',
          changes: { source: 'seed', status: 'DRAFT' },
          ipAddress: '127.0.0.1',
        },
        {
          id: '60000000-0000-4000-8000-000000000002',
          userId: user.id,
          caseId: ids.cases.calculated,
          action: 'INHERITANCE_CALCULATED',
          changes: {
            source: 'seed',
            status: 'CALCULATED',
            eligibleHeirs: 5,
          },
          ipAddress: '127.0.0.1',
        },
        {
          id: '60000000-0000-4000-8000-000000000003',
          userId: admin.id,
          caseId: ids.cases.closed,
          action: 'CASE_CLOSED',
          changes: { source: 'seed', status: 'CLOSED' },
          ipAddress: '127.0.0.1',
        },
      ],
    });

    return {
      users: await tx.user.count(),
      cases: await tx.case.count({ where: { id: { in: caseIds } } }),
      familyMembers: await tx.familyMember.count({
        where: { caseId: { in: caseIds } },
      }),
      heirs: await tx.heir.count({ where: { caseId: { in: caseIds } } }),
      blockedHeirs: await tx.blockedHeir.count({
        where: { heir: { caseId: { in: caseIds } } },
      }),
      reports: await tx.report.count({ where: { caseId: { in: caseIds } } }),
      auditLogs: await tx.auditLog.count({
        where: { caseId: { in: caseIds } },
      }),
    };
  });

  console.log('Seed completed successfully:', result);
  console.log('Admin login: admin@inheritance.local /', adminPassword);
  console.log('User login: user@inheritance.local /', userPassword);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
