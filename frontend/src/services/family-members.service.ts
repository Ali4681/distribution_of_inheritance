import { apiPost, apiGet, apiPatch, apiDelete } from "@/lib";
import {
  CreateFamilyMemberDto,
  DeleteResponse,
  FamilyMember,
  FamilyTreeResponse,
  UpdateFamilyMemberDto,
} from "@/types";


export const familyMembersService = {
  /** POST /family-members */
  create(dto: CreateFamilyMemberDto): Promise<FamilyMember> {
    return apiPost<FamilyMember>("/family-members", dto);
  },

  /** GET /family-members?caseId= */
  findAll(caseId?: string): Promise<FamilyMember[]> {
    return apiGet<FamilyMember[]>("/family-members", { caseId });
  },

  /** GET /family-members/tree/:caseId */
  getTree(caseId: string): Promise<FamilyTreeResponse> {
    return apiGet<FamilyTreeResponse>(`/family-members/tree/${caseId}`);
  },

  /** GET /family-members/:id */
  findOne(id: string): Promise<FamilyMember> {
    return apiGet<FamilyMember>(`/family-members/${id}`);
  },

  /** PATCH /family-members/:id */
  update(id: string, dto: UpdateFamilyMemberDto): Promise<FamilyMember> {
    return apiPatch<FamilyMember>(`/family-members/${id}`, dto);
  },

  /** DELETE /family-members/:id */
  remove(id: string): Promise<DeleteResponse> {
    return apiDelete<DeleteResponse>(`/family-members/${id}`);
  },
};
