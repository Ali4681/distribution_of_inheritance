import { apiPost, apiGet, apiDelete } from "@/lib";
import { HeirsResponse, Heir, DeleteResponse } from "@/types";


export const heirsService = {
  /** POST /heirs/calculate/:caseId */
  calculate(caseId: string): Promise<HeirsResponse> {
    return apiPost<HeirsResponse>(`/heirs/calculate/${caseId}`);
  },

  /** GET /heirs?caseId= */
  findByCase(caseId: string): Promise<HeirsResponse> {
    return apiGet<HeirsResponse>("/heirs", { caseId });
  },

  /** GET /heirs/:id */
  findOne(id: string): Promise<Heir> {
    return apiGet<Heir>(`/heirs/${id}`);
  },

  /** DELETE /heirs/case/:caseId */
  clearCase(caseId: string): Promise<DeleteResponse> {
    return apiDelete<DeleteResponse>(`/heirs/case/${caseId}`);
  },
};
