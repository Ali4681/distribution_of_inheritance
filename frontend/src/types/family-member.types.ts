import { Gender, RelationType } from "./enums";
import { Heir } from "./heir.types";

export interface FamilyMember {
  id: string;
  caseId: string;
  parentId: string | null;
  fullName: string;
  gender: Gender;
  relationType: RelationType;
  isAlive: boolean;
  isMuslim: boolean;
  isMurderer: boolean;
  birthDate: string | null;
  parent?: FamilyMember | null;
  children?: FamilyMember[];
  heir?: Heir | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFamilyMemberDto {
  caseId: string;
  parentId?: string;
  spouseId?: string;
  fullName: string;
  gender: Gender;
  relationType: RelationType;
  isAlive?: boolean;
  isMuslim?: boolean;
  isMurderer?: boolean;
  birthDate?: string;
}

export type UpdateFamilyMemberDto = Partial<CreateFamilyMemberDto>;

export type FamilyTreeNodeType = "DECEASED" | "MEMBER" | "FAMILY_UNION";
export type FamilyTreeEdgeType =
  | "PARENT"
  | "SPOUSE"
  | "FAMILY_CHILD"
  | "RELATED";

export interface FamilyTreeMember {
  id: string;
  caseId: string;
  parentId: string | null;
  fullName: string;
  gender: Gender;
  relationType: RelationType;
  isAlive: boolean;
  isMuslim: boolean;
  isMurderer: boolean;
  birthDate: string | null;
  heir: {
    id: string;
    isEligible: boolean;
    shareFraction: string | null;
    sharePercentage: number | null;
    monetaryValue: number | null;
    legalBasis: string | null;
  } | null;
}

export interface FamilyTreeNode {
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
}

export interface FamilyTreeEdge {
  id: string;
  source: string;
  target: string;
  type: FamilyTreeEdgeType;
  label?: string;
}

export interface SpouseFamily {
  id: string;
  spouse: FamilyTreeMember;
  children: FamilyTreeMember[];
}

export interface FamilyTreeResponse {
  case: {
    id: string;
    deceasedName: string;
    deathDate: string;
    totalEstate: number;
    currency: string;
    status: string;
  };
  deceasedNodeId: string;
  nodes: FamilyTreeNode[];
  edges: FamilyTreeEdge[];
  spouseFamilies: SpouseFamily[];
  unassignedChildren: FamilyTreeMember[];
  usage: {
    directChildLinkField: string;
    directChildStorageField: string;
    note: string;
  };
}
