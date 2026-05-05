"use client";

import { useAsync, useMutation } from "@/lib";
import { heirsService } from "@/services";



export function useHeirs(caseId: string) {
  return useAsync(() => heirsService.findByCase(caseId), [caseId], !!caseId);
}

export function useHeir(id: string) {
  return useAsync(() => heirsService.findOne(id), [id], !!id);
}

export function useCalculateHeirs() {
  const { mutate, loading, error, reset } = useMutation((caseId: string) =>
    heirsService.calculate(caseId),
  );
  return { calculate: mutate, loading, error, reset };
}

export function useClearHeirs() {
  const { mutate, loading, error, reset } = useMutation((caseId: string) =>
    heirsService.clearCase(caseId),
  );
  return { clearHeirs: mutate, loading, error, reset };
}
