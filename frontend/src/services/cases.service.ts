import { apiPost, apiGet, apiPatch, apiDelete } from "@/lib";
import { CreateCaseDto, InheritanceCase, CaseListItem, UpdateCaseDto, DeleteResponse } from "@/types";


export const casesService = {
  /** POST /cases */
  create(dto: CreateCaseDto): Promise<InheritanceCase> {
    return apiPost<InheritanceCase>("/cases", dto);
  },

  /** GET /cases */
  findAll(): Promise<CaseListItem[]> {
    return apiGet<CaseListItem[]>("/cases");
  },

  /** GET /cases/:id */
  findOne(id: string): Promise<InheritanceCase> {
    return apiGet<InheritanceCase>(`/cases/${id}`);
  },

  /** PATCH /cases/:id */
  update(id: string, dto: UpdateCaseDto): Promise<InheritanceCase> {
    return apiPatch<InheritanceCase>(`/cases/${id}`, dto);
  },

  /** DELETE /cases/:id */
  remove(id: string): Promise<DeleteResponse> {
    return apiDelete<DeleteResponse>(`/cases/${id}`);
  },
};
