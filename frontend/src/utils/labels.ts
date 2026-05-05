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
