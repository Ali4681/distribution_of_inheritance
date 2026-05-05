import { apiGet } from "@/lib";
import { BlockedHeir } from "@/types";


export const blockedHeirsService = {
  /** GET /blocked-heirs?caseId= */
  findAll(caseId?: string): Promise<BlockedHeir[]> {
    return apiGet<BlockedHeir[]>("/blocked-heirs", { caseId });
  },
};
