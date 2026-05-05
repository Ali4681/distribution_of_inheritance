import { apiDownload, apiGet, type DownloadResult } from "@/lib";
import { Language, Report } from "@/types";

export const reportsService = {
  findAll(caseId?: string): Promise<Report[]> {
    return apiGet<Report[]>("/reports", { caseId });
  },

  generatePdf(
    caseId: string,
    language: Language = Language.AR,
  ): Promise<DownloadResult> {
    return apiDownload(
      `/reports/cases/${caseId}/pdf?language=${language}`,
      "POST",
    );
  },

  downloadBlob(blob: Blob, filename: string): void {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  },
};
