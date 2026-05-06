import type { Dictionary } from "@/lib/i18n";
import { CaseStatus, Language, Role } from "@/types";

export function caseStatusLabel(status: CaseStatus, t: Dictionary) {
  switch (status) {
    case CaseStatus.DRAFT:
      return t.draft;
    case CaseStatus.CALCULATED:
      return t.calculated;
    case CaseStatus.CLOSED:
      return t.closed;
    default:
      return status;
  }
}

export function roleLabel(role: Role, t: Dictionary) {
  return role === Role.ADMIN ? t.admin : t.user;
}

export function languageLabel(language: Language | string, t: Dictionary) {
  return language === Language.AR ? t.arabic : t.english;
}

function humanizeToken(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function auditActionLabel(action: string, t: Dictionary) {
  switch (action) {
    case "CASE_CREATED":
      return t.caseCreatedAction;
    case "CASE_UPDATED":
      return t.caseUpdatedAction;
    case "CASE_DELETED":
      return t.caseDeletedAction;
    case "FAMILY_MEMBER_CREATED":
      return t.familyMemberCreatedAction;
    case "FAMILY_MEMBER_UPDATED":
      return t.familyMemberUpdatedAction;
    case "FAMILY_MEMBER_DELETED":
      return t.familyMemberDeletedAction;
    case "INHERITANCE_CALCULATED":
      return t.inheritanceCalculatedAction;
    case "HEIRS_CLEARED":
      return t.heirsClearedAction;
    case "PDF_REPORT_GENERATED":
      return t.pdfReportGeneratedAction;
    default:
      return humanizeToken(action);
  }
}
