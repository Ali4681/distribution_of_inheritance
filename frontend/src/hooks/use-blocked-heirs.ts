"use client";

import { useAsync } from "@/lib";
import { blockedHeirsService } from "@/services";



export function useBlockedHeirs(caseId?: string) {
  return useAsync(() => blockedHeirsService.findAll(caseId), [caseId]);
}
