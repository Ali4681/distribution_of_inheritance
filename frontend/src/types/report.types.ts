import { Language, ReportType } from "./enums";
import { User } from "./user.types";

export interface Report {
  id: string;
  caseId: string;
  generatedBy: string;
  filePath: string;
  reportType: ReportType;
  language: Language;
  generator?: User;
  createdAt: string;
}
