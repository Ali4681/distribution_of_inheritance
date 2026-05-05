import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, Prisma, RelationType, Role } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyMemberDto } from './dto/create-family_member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family_member.dto';

const familyMemberInclude = {
  parent: true,
  children: true,
  heir: true,
} as const satisfies Prisma.FamilyMemberInclude;

const treeCaseSelect = {
  id: true,
  deceasedName: true,
  deathDate: true,
  totalEstate: true,
  currency: true,
  status: true,
} as const satisfies Prisma.CaseSelect;

const treeMemberInclude = {
  heir: true,
} as const satisfies Prisma.FamilyMemberInclude;

const spouseRelations = new Set<RelationType>([
  RelationType.HUSBAND,
  RelationType.WIFE,
]);

const directChildRelations = new Set<RelationType>([
  RelationType.SON,
  RelationType.DAUGHTER,
]);

const grandchildRelations = new Set<RelationType>([
  RelationType.SON_OF_SON,
  RelationType.DAUGHTER_OF_SON,
]);

const paternalGrandparentRelations = new Set<RelationType>([
  RelationType.PATERNAL_GRANDFATHER,
  RelationType.PATERNAL_GRANDMOTHER,
]);

const maternalGrandparentRelations = new Set<RelationType>([
  RelationType.MATERNAL_GRANDFATHER,
  RelationType.MATERNAL_GRANDMOTHER,
]);

const fullSiblingRelations = new Set<RelationType>([
  RelationType.BROTHER,
  RelationType.SISTER,
  RelationType.FULL_BROTHER,
  RelationType.FULL_SISTER,
]);

const paternalSiblingRelations = new Set<RelationType>([
  RelationType.PATERNAL_BROTHER,
  RelationType.PATERNAL_SISTER,
]);

const maternalSiblingRelations = new Set<RelationType>([
  RelationType.MATERNAL_BROTHER,
  RelationType.MATERNAL_SISTER,
]);

const paternalCollateralRelations = new Set<RelationType>([
  RelationType.PATERNAL_UNCLE,
  RelationType.PATERNAL_UNCLE_FULL,
  RelationType.PATERNAL_UNCLE_PATERNAL,
  RelationType.PATERNAL_AUNT,
]);

const maternalCollateralRelations = new Set<RelationType>([
  RelationType.MATERNAL_UNCLE,
  RelationType.MATERNAL_AUNT,
]);

const genderByRelation = new Map<RelationType, Gender>([
  [RelationType.FATHER, Gender.MALE],
  [RelationType.MOTHER, Gender.FEMALE],
  [RelationType.HUSBAND, Gender.MALE],
  [RelationType.WIFE, Gender.FEMALE],
  [RelationType.SON, Gender.MALE],
  [RelationType.DAUGHTER, Gender.FEMALE],
  [RelationType.SON_OF_SON, Gender.MALE],
  [RelationType.DAUGHTER_OF_SON, Gender.FEMALE],
  [RelationType.BROTHER, Gender.MALE],
  [RelationType.SISTER, Gender.FEMALE],
  [RelationType.FULL_BROTHER, Gender.MALE],
  [RelationType.FULL_SISTER, Gender.FEMALE],
  [RelationType.PATERNAL_BROTHER, Gender.MALE],
  [RelationType.PATERNAL_SISTER, Gender.FEMALE],
  [RelationType.MATERNAL_BROTHER, Gender.MALE],
  [RelationType.MATERNAL_SISTER, Gender.FEMALE],
  [RelationType.PATERNAL_GRANDFATHER, Gender.MALE],
  [RelationType.PATERNAL_GRANDMOTHER, Gender.FEMALE],
  [RelationType.MATERNAL_GRANDFATHER, Gender.MALE],
  [RelationType.MATERNAL_GRANDMOTHER, Gender.FEMALE],
  [RelationType.PATERNAL_UNCLE, Gender.MALE],
  [RelationType.PATERNAL_UNCLE_FULL, Gender.MALE],
  [RelationType.PATERNAL_UNCLE_PATERNAL, Gender.MALE],
  [RelationType.MATERNAL_UNCLE, Gender.MALE],
  [RelationType.PATERNAL_AUNT, Gender.FEMALE],
  [RelationType.MATERNAL_AUNT, Gender.FEMALE],
]);

type TreeCase = Prisma.CaseGetPayload<{ select: typeof treeCaseSelect }>;
type TreeMember = Prisma.FamilyMemberGetPayload<{
  include: typeof treeMemberInclude;
}>;
type ParentReference = Pick<TreeMember, 'id' | 'caseId' | 'relationType'>;

type FamilyTreeNodeType = 'DECEASED' | 'MEMBER' | 'FAMILY_UNION';
type FamilyTreeEdgeType = 'PARENT' | 'SPOUSE' | 'FAMILY_CHILD' | 'RELATED';

type FamilyTreeMember = {
  id: string;
  caseId: string;
  parentId: string | null;
  fullName: string;
  gender: Gender;
  relationType: RelationType;
  isAlive: boolean;
  isMuslim: boolean;
  isMurderer: boolean;
  birthDate: Date | null;
  heir: {
    id: string;
    isEligible: boolean;
    shareFraction: string | null;
    sharePercentage: number | null;
    monetaryValue: number | null;
    legalBasis: string | null;
  } | null;
};

type FamilyTreeNode = {
  id: string;
  type: FamilyTreeNodeType;
  label: string;
  generation: number;
  lane: string;
  relationType?: RelationType;
  gender?: Gender;
  isAlive?: boolean;
  parentId?: string | null;
  familyId?: string;
  member?: FamilyTreeMember;
};

type FamilyTreeEdge = {
  id: string;
  source: string;
  target: string;
  type: FamilyTreeEdgeType;
  label?: string;
};

@Injectable()
export class FamilyMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFamilyMemberDto: CreateFamilyMemberDto, user: AuthUser) {
    await this.assertCanAccessCase(createFamilyMemberDto.caseId, user);
    const parentId = await this.resolveParentIdForCreate(createFamilyMemberDto);

    return this.prisma.familyMember.create({
      data: {
        caseId: createFamilyMemberDto.caseId,
        parentId,
        fullName: createFamilyMemberDto.fullName,
        gender: createFamilyMemberDto.gender,
        relationType: createFamilyMemberDto.relationType,
        isAlive: createFamilyMemberDto.isAlive ?? true,
        isMuslim: createFamilyMemberDto.isMuslim ?? true,
        isMurderer: createFamilyMemberDto.isMurderer ?? false,
        birthDate: createFamilyMemberDto.birthDate
          ? new Date(createFamilyMemberDto.birthDate)
          : undefined,
      },
      include: familyMemberInclude,
    });
  }

  async findAll(user: AuthUser, caseId?: string) {
    if (caseId) {
      await this.assertCanAccessCase(caseId, user);
    }

    return this.prisma.familyMember.findMany({
      where:
        user.role === Role.ADMIN
          ? { caseId }
          : { case: { ownerId: user.id }, caseId },
      include: familyMemberInclude,
      orderBy: [
        { caseId: 'asc' },
        { relationType: 'asc' },
        { fullName: 'asc' },
      ],
    });
  }

  async getTree(user: AuthUser, caseId: string) {
    await this.assertCanAccessCase(caseId, user);

    const inheritanceCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: treeCaseSelect,
    });

    if (!inheritanceCase) {
      throw new NotFoundException('Case not found');
    }

    const members = await this.prisma.familyMember.findMany({
      where: { caseId },
      include: treeMemberInclude,
      orderBy: [
        { relationType: 'asc' },
        { parentId: 'asc' },
        { fullName: 'asc' },
      ],
    });

    return this.buildTree(inheritanceCase, members);
  }

  async findOne(id: string, user: AuthUser) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id },
      include: { case: true, ...familyMemberInclude },
    });

    if (!member) {
      throw new NotFoundException('Family member not found');
    }

    this.assertCanAccessLoadedCase(member.case.ownerId, user);

    return member;
  }

  async update(
    id: string,
    updateFamilyMemberDto: UpdateFamilyMemberDto,
    user: AuthUser,
  ) {
    const member = await this.findOne(id, user);
    const relationType =
      updateFamilyMemberDto.relationType ?? member.relationType;
    const gender = updateFamilyMemberDto.gender ?? member.gender;
    const parentId = await this.resolveParentIdForUpdate(
      updateFamilyMemberDto,
      member.caseId,
      id,
      member.parentId,
      relationType,
      gender,
    );

    return this.prisma.familyMember.update({
      where: { id },
      data: {
        parentId,
        fullName: updateFamilyMemberDto.fullName,
        gender: updateFamilyMemberDto.gender,
        relationType: updateFamilyMemberDto.relationType,
        isAlive: updateFamilyMemberDto.isAlive,
        isMuslim: updateFamilyMemberDto.isMuslim,
        isMurderer: updateFamilyMemberDto.isMurderer,
        birthDate: updateFamilyMemberDto.birthDate
          ? new Date(updateFamilyMemberDto.birthDate)
          : undefined,
      },
      include: familyMemberInclude,
    });
  }

  async remove(id: string, user: AuthUser) {
    const member = await this.findOne(id, user);
    const heir = await this.prisma.heir.findUnique({
      where: { memberId: member.id },
      select: { id: true },
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [];
    if (heir) {
      operations.push(
        this.prisma.blockedHeir.deleteMany({
          where: { OR: [{ heirId: heir.id }, { blockedById: heir.id }] },
        }),
        this.prisma.heir.delete({ where: { id: heir.id } }),
      );
    }

    operations.push(this.prisma.familyMember.delete({ where: { id } }));
    await this.prisma.$transaction(operations);

    return { status: true, message: 'Family member deleted successfully' };
  }

  private async resolveParentIdForCreate(dto: CreateFamilyMemberDto) {
    this.assertGenderMatchesRelation(dto.relationType, dto.gender);

    const requestedParentId = this.resolveSingleParentId(
      dto.parentId,
      dto.spouseId,
    );

    if (requestedParentId) {
      const parent = await this.getParentInCase(requestedParentId, dto.caseId);
      this.assertParentRelationAllowed(
        dto.relationType,
        parent,
        !!dto.spouseId,
      );
      return requestedParentId;
    }

    return this.findDefaultSpouseParentId(dto.caseId, dto.relationType);
  }

  private async resolveParentIdForUpdate(
    dto: UpdateFamilyMemberDto,
    caseId: string,
    memberId: string,
    currentParentId: string | null,
    relationType: RelationType,
    gender: Gender,
  ) {
    this.assertGenderMatchesRelation(relationType, gender);

    const hasParentInput =
      dto.parentId !== undefined || dto.spouseId !== undefined;
    const parentId = hasParentInput
      ? this.resolveSingleParentId(dto.parentId, dto.spouseId)
      : currentParentId;

    if (!parentId) {
      return hasParentInput ? null : undefined;
    }

    if (parentId === memberId) {
      throw new BadRequestException('A member cannot be their own parent');
    }

    const parent = await this.getParentInCase(parentId, caseId);
    this.assertParentRelationAllowed(relationType, parent, !!dto.spouseId);

    return hasParentInput ? parentId : undefined;
  }

  private resolveSingleParentId(parentId?: string, spouseId?: string) {
    if (parentId && spouseId && parentId !== spouseId) {
      throw new BadRequestException('parentId and spouseId must match');
    }

    return spouseId ?? parentId;
  }

  private async getParentInCase(parentId: string, caseId: string) {
    const parent = await this.prisma.familyMember.findUnique({
      where: { id: parentId },
      select: { id: true, caseId: true, relationType: true },
    });

    if (!parent || parent.caseId !== caseId) {
      throw new BadRequestException('Parent must belong to the same case');
    }

    return parent;
  }

  private async findDefaultSpouseParentId(
    caseId: string,
    relationType: RelationType,
  ) {
    if (!this.isDirectChildRelation(relationType)) {
      return undefined;
    }

    const spouses = await this.prisma.familyMember.findMany({
      where: {
        caseId,
        relationType: { in: [RelationType.HUSBAND, RelationType.WIFE] },
      },
      select: { id: true },
      take: 2,
    });

    return spouses.length === 1 ? spouses[0].id : undefined;
  }

  private assertGenderMatchesRelation(
    relationType: RelationType,
    gender: Gender,
  ) {
    const expectedGender = genderByRelation.get(relationType);

    if (expectedGender && expectedGender !== gender) {
      throw new BadRequestException(
        `${relationType} must have gender ${expectedGender}`,
      );
    }
  }

  private assertParentRelationAllowed(
    relationType: RelationType,
    parent: ParentReference,
    spouseIdWasUsed: boolean,
  ) {
    if (spouseIdWasUsed && !this.isDirectChildRelation(relationType)) {
      throw new BadRequestException(
        'spouseId can only be used for SON or DAUGHTER',
      );
    }

    if (this.isSpouseRelation(relationType)) {
      throw new BadRequestException(
        'Spouses of the deceased should not have parentId or spouseId',
      );
    }

    if (this.isDirectChildRelation(relationType)) {
      if (!this.isSpouseRelation(parent.relationType)) {
        throw new BadRequestException(
          'Direct children of the deceased must be linked to a WIFE or HUSBAND when parentId/spouseId is provided',
        );
      }
      return;
    }

    if (this.isGrandchildRelation(relationType)) {
      if (
        parent.relationType !== RelationType.SON &&
        parent.relationType !== RelationType.SON_OF_SON
      ) {
        throw new BadRequestException(
          'Grandchildren through sons must be linked to SON or SON_OF_SON',
        );
      }
    }
  }

  private buildTree(inheritanceCase: TreeCase, members: TreeMember[]) {
    const deceasedNodeId = `case:${inheritanceCase.id}:deceased`;
    const membersById = new Map(members.map((member) => [member.id, member]));
    const spouses = members.filter((member) =>
      this.isSpouseRelation(member.relationType),
    );
    const spousesById = new Map(spouses.map((spouse) => [spouse.id, spouse]));
    const directChildren = members.filter((member) =>
      this.isDirectChildRelation(member.relationType),
    );
    const unassignedChildren = directChildren.filter(
      (child) => !child.parentId || !spousesById.has(child.parentId),
    );
    const unassignedFamilyId = `family:${inheritanceCase.id}:unassigned`;

    const spouseFamilies = spouses.map((spouse) => {
      const familyId = this.familyNodeId(inheritanceCase.id, spouse.id);
      return {
        id: familyId,
        spouse: this.toTreeMember(spouse),
        children: directChildren
          .filter((child) => child.parentId === spouse.id)
          .map((child) => this.toTreeMember(child)),
      };
    });

    const nodes: FamilyTreeNode[] = [
      {
        id: deceasedNodeId,
        type: 'DECEASED',
        label: inheritanceCase.deceasedName,
        generation: 0,
        lane: 'deceased',
      },
      ...spouseFamilies.map((family): FamilyTreeNode => {
        return {
          id: family.id,
          type: 'FAMILY_UNION',
          label: 'family',
          generation: 1,
          lane: `spouse:${family.spouse.id}`,
          familyId: family.id,
        };
      }),
      ...(unassignedChildren.length
        ? [
            {
              id: unassignedFamilyId,
              type: 'FAMILY_UNION' as const,
              label: 'unassigned children',
              generation: 1,
              lane: 'unassigned-children',
              familyId: unassignedFamilyId,
            },
          ]
        : []),
      ...members.map((member): FamilyTreeNode => {
        return {
          id: member.id,
          type: 'MEMBER',
          label: member.fullName,
          generation: this.generationFor(member.relationType),
          lane: this.laneFor(member, inheritanceCase.id, spousesById),
          relationType: member.relationType,
          gender: member.gender,
          isAlive: member.isAlive,
          parentId: member.parentId,
          familyId: this.familyIdFor(member, inheritanceCase.id, spousesById),
          member: this.toTreeMember(member),
        };
      }),
    ];

    const edges: FamilyTreeEdge[] = [];

    for (const family of spouseFamilies) {
      this.pushEdge(edges, deceasedNodeId, family.id, 'SPOUSE');
      this.pushEdge(edges, family.spouse.id, family.id, 'SPOUSE');

      for (const child of family.children) {
        this.pushEdge(edges, family.id, child.id, 'FAMILY_CHILD');
      }
    }

    if (unassignedChildren.length) {
      this.pushEdge(edges, deceasedNodeId, unassignedFamilyId, 'FAMILY_CHILD');
      for (const child of unassignedChildren) {
        this.pushEdge(edges, unassignedFamilyId, child.id, 'FAMILY_CHILD');
      }
    }

    this.addAncestorEdges(edges, deceasedNodeId, members);
    this.addCollateralEdges(edges, deceasedNodeId, members);
    this.addDescendantFallbackEdges(edges, deceasedNodeId, members);

    for (const member of members) {
      if (
        member.parentId &&
        membersById.has(member.parentId) &&
        !this.isDirectChildRelation(member.relationType)
      ) {
        this.pushEdge(edges, member.parentId, member.id, 'PARENT');
      }
    }

    this.addFallbackEdges(edges, deceasedNodeId, members);

    return {
      case: {
        id: inheritanceCase.id,
        deceasedName: inheritanceCase.deceasedName,
        deathDate: inheritanceCase.deathDate,
        totalEstate: Number(inheritanceCase.totalEstate),
        currency: inheritanceCase.currency,
        status: inheritanceCase.status,
      },
      deceasedNodeId,
      nodes,
      edges,
      spouseFamilies,
      unassignedChildren: unassignedChildren.map((child) =>
        this.toTreeMember(child),
      ),
      usage: {
        directChildLinkField: 'spouseId',
        directChildStorageField: 'parentId',
        note: 'For SON and DAUGHTER, send spouseId with the WIFE/HUSBAND id to place the child under that spouse family automatically.',
      },
    };
  }

  private addAncestorEdges(
    edges: FamilyTreeEdge[],
    deceasedNodeId: string,
    members: TreeMember[],
  ) {
    const father = members.find(
      (member) => member.relationType === RelationType.FATHER,
    );
    const mother = members.find(
      (member) => member.relationType === RelationType.MOTHER,
    );

    for (const member of members) {
      if (
        member.relationType === RelationType.FATHER ||
        member.relationType === RelationType.MOTHER
      ) {
        this.pushEdge(edges, member.id, deceasedNodeId, 'PARENT');
      }

      if (paternalGrandparentRelations.has(member.relationType)) {
        this.pushEdge(edges, member.id, father?.id ?? deceasedNodeId, 'PARENT');
      }

      if (maternalGrandparentRelations.has(member.relationType)) {
        this.pushEdge(edges, member.id, mother?.id ?? deceasedNodeId, 'PARENT');
      }
    }
  }

  private addCollateralEdges(
    edges: FamilyTreeEdge[],
    deceasedNodeId: string,
    members: TreeMember[],
  ) {
    const father = members.find(
      (member) => member.relationType === RelationType.FATHER,
    );
    const mother = members.find(
      (member) => member.relationType === RelationType.MOTHER,
    );
    const paternalGrandfather = members.find(
      (member) => member.relationType === RelationType.PATERNAL_GRANDFATHER,
    );
    const paternalGrandmother = members.find(
      (member) => member.relationType === RelationType.PATERNAL_GRANDMOTHER,
    );
    const maternalGrandfather = members.find(
      (member) => member.relationType === RelationType.MATERNAL_GRANDFATHER,
    );
    const maternalGrandmother = members.find(
      (member) => member.relationType === RelationType.MATERNAL_GRANDMOTHER,
    );

    for (const member of members) {
      if (fullSiblingRelations.has(member.relationType)) {
        this.pushEdge(
          edges,
          father?.id ?? mother?.id ?? deceasedNodeId,
          member.id,
          'RELATED',
        );
        continue;
      }

      if (paternalSiblingRelations.has(member.relationType)) {
        this.pushEdge(
          edges,
          father?.id ?? deceasedNodeId,
          member.id,
          'RELATED',
        );
        continue;
      }

      if (maternalSiblingRelations.has(member.relationType)) {
        this.pushEdge(
          edges,
          mother?.id ?? deceasedNodeId,
          member.id,
          'RELATED',
        );
        continue;
      }

      if (paternalCollateralRelations.has(member.relationType)) {
        this.pushEdge(
          edges,
          paternalGrandfather?.id ??
            paternalGrandmother?.id ??
            father?.id ??
            deceasedNodeId,
          member.id,
          'RELATED',
        );
        continue;
      }

      if (maternalCollateralRelations.has(member.relationType)) {
        this.pushEdge(
          edges,
          maternalGrandfather?.id ??
            maternalGrandmother?.id ??
            mother?.id ??
            deceasedNodeId,
          member.id,
          'RELATED',
        );
      }
    }
  }

  private addDescendantFallbackEdges(
    edges: FamilyTreeEdge[],
    deceasedNodeId: string,
    members: TreeMember[],
  ) {
    const firstSon = members.find(
      (member) => member.relationType === RelationType.SON,
    );

    for (const member of members) {
      if (
        this.isGrandchildRelation(member.relationType) &&
        !this.hasEdgeForNode(edges, member.id)
      ) {
        this.pushEdge(
          edges,
          firstSon?.id ?? deceasedNodeId,
          member.id,
          'RELATED',
        );
      }
    }
  }

  private addFallbackEdges(
    edges: FamilyTreeEdge[],
    deceasedNodeId: string,
    members: TreeMember[],
  ) {
    for (const member of members) {
      if (!this.hasEdgeForNode(edges, member.id)) {
        this.pushEdge(edges, deceasedNodeId, member.id, 'RELATED');
      }
    }
  }

  private hasEdgeForNode(edges: FamilyTreeEdge[], nodeId: string) {
    return edges.some(
      (edge) => edge.source === nodeId || edge.target === nodeId,
    );
  }

  private pushEdge(
    edges: FamilyTreeEdge[],
    source: string,
    target: string,
    type: FamilyTreeEdgeType,
  ) {
    if (source === target) {
      return;
    }

    const id = `${type}:${source}:${target}`;
    if (!edges.some((edge) => edge.id === id)) {
      edges.push({ id, source, target, type });
    }
  }

  private toTreeMember(member: TreeMember): FamilyTreeMember {
    return {
      id: member.id,
      caseId: member.caseId,
      parentId: member.parentId,
      fullName: member.fullName,
      gender: member.gender,
      relationType: member.relationType,
      isAlive: member.isAlive,
      isMuslim: member.isMuslim,
      isMurderer: member.isMurderer,
      birthDate: member.birthDate,
      heir: member.heir
        ? {
            id: member.heir.id,
            isEligible: member.heir.isEligible,
            shareFraction: member.heir.shareFraction,
            sharePercentage:
              member.heir.sharePercentage === null
                ? null
                : Number(member.heir.sharePercentage),
            monetaryValue:
              member.heir.monetaryValue === null
                ? null
                : Number(member.heir.monetaryValue),
            legalBasis: member.heir.legalBasis,
          }
        : null,
    };
  }

  private familyIdFor(
    member: TreeMember,
    caseId: string,
    spousesById: Map<string, TreeMember>,
  ) {
    if (this.isSpouseRelation(member.relationType)) {
      return this.familyNodeId(caseId, member.id);
    }

    if (
      this.isDirectChildRelation(member.relationType) &&
      member.parentId &&
      spousesById.has(member.parentId)
    ) {
      return this.familyNodeId(caseId, member.parentId);
    }

    return undefined;
  }

  private laneFor(
    member: TreeMember,
    caseId: string,
    spousesById: Map<string, TreeMember>,
  ) {
    const familyId = this.familyIdFor(member, caseId, spousesById);
    if (familyId) {
      return familyId;
    }

    if (this.isDirectChildRelation(member.relationType)) {
      return 'unassigned-children';
    }

    return member.relationType.toLowerCase();
  }

  private familyNodeId(caseId: string, spouseId: string) {
    return `family:${caseId}:spouse:${spouseId}`;
  }

  private generationFor(relationType: RelationType) {
    if (
      relationType === RelationType.PATERNAL_GRANDFATHER ||
      relationType === RelationType.PATERNAL_GRANDMOTHER ||
      relationType === RelationType.MATERNAL_GRANDFATHER ||
      relationType === RelationType.MATERNAL_GRANDMOTHER
    ) {
      return -2;
    }

    if (
      relationType === RelationType.FATHER ||
      relationType === RelationType.MOTHER ||
      relationType === RelationType.PATERNAL_UNCLE ||
      relationType === RelationType.PATERNAL_UNCLE_FULL ||
      relationType === RelationType.PATERNAL_UNCLE_PATERNAL ||
      relationType === RelationType.PATERNAL_AUNT ||
      relationType === RelationType.MATERNAL_UNCLE ||
      relationType === RelationType.MATERNAL_AUNT
    ) {
      return -1;
    }

    if (this.isDirectChildRelation(relationType)) {
      return 2;
    }

    if (this.isGrandchildRelation(relationType)) {
      return 3;
    }

    return 0;
  }

  private isSpouseRelation(relationType: RelationType) {
    return spouseRelations.has(relationType);
  }

  private isDirectChildRelation(relationType: RelationType) {
    return directChildRelations.has(relationType);
  }

  private isGrandchildRelation(relationType: RelationType) {
    return grandchildRelations.has(relationType);
  }

  private async assertCanAccessCase(caseId: string, user: AuthUser) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { ownerId: true },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    this.assertCanAccessLoadedCase(existingCase.ownerId, user);
  }

  private assertCanAccessLoadedCase(ownerId: string, user: AuthUser) {
    if (user.role !== Role.ADMIN && ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this case');
    }
  }
}
