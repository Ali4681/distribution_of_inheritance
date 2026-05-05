"use client";

import { useAsync } from "@/lib";
import { reportsService } from "@/services";
import { Language } from "@/types";
import { useCallback, useState } from "react";


export function useReports(caseId?: string) {
  return useAsync(() => reportsService.findAll(caseId), [caseId]);
}

export function useGeneratePdf() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = useCallback(
    async (
      caseId: string,
      language: Language,
      filename?: string,
    ): Promise<Blob> => {
      setLoading(true);
      setError(null);
      try {
        const file = await reportsService.generatePdf(caseId, language);
        reportsService.downloadBlob(
          file.blob,
          file.filename ?? filename ?? `inheritance-${caseId}.pdf`,
        );
        setLoading(false);
        return file.blob;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate PDF";
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  const reset = useCallback(() => setError(null), []);

  return { generatePdf, loading, error, reset };
}
