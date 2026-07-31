import { CaseStatus } from "./enums";
import { FamilyMember } from "./family-member.types";
import { Heir } from "./heir.types";
import { Report } from "./report.types";

export interface EstateProperty {
  id: string;
  caseId: string;
  name: string;
  description: string | null;
  totalShares: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEstatePropertyDto {
  name: string;
  description?: string;
  totalShares?: number;
}

export interface InheritanceCase {
  id: string;
  ownerId: string;
  deceasedName: string;
  deathDate: string;
  totalEstate: number;
  funeralCosts: number;
  debts: number;
  mandatoryWill: number;
  optionalWill: number;
  currency: string;
  status: CaseStatus;
  familyMembers: FamilyMember[];
  heirs: Heir[];
  reports: Report[];
  properties: EstateProperty[];
  createdAt: string;
  updatedAt: string;
}

export interface CaseListItem {
  id: string;
  ownerId: string;
  deceasedName: string;
  deathDate: string;
  totalEstate: number;
  currency: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  _count: {
    familyMembers: number;
    heirs: number;
    reports: number;
  };
}

export interface CreateCaseDto {
  deceasedName: string;
  deathDate: string;
  totalEstate: number;
  currency?: string;
  funeralCosts?: number;
  debts?: number;
  mandatoryWill?: number;
  optionalWill?: number;
  properties?: CreateEstatePropertyDto[];
}

export type UpdateCaseDto = Partial<CreateCaseDto>;
