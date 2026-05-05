import { FamilyMember } from "./family-member.types";
import { BlockedHeir } from "./blocked-heir.types";

export interface Heir {
  id: string;
  caseId: string;
  memberId: string;
  isEligible: boolean;
  shareFraction: string | null;
  sharePercentage: number | string | null;
  monetaryValue: number | string | null;
  legalBasis: string | null;
  member: FamilyMember;
  blockedBy?: BlockedHeir[];
  calculatedAt: string;
}

export interface HeirTotals {
  eligible: number;
  blocked: number;
  sharePercentage: number;
  monetaryValue: number;
}

export interface HeirsResponse {
  status: boolean;
  calculatedCount?: number;
  heirs: Heir[];
  totals: HeirTotals;
}
