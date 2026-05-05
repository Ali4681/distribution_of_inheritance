"use client";

import { useAsync, useMutation } from "@/lib";
import { familyMembersService } from "@/services";
import { CreateFamilyMemberDto, UpdateFamilyMemberDto } from "@/types";



export function useFamilyMembers(caseId?: string) {
  return useAsync(() => familyMembersService.findAll(caseId), [caseId]);
}

export function useFamilyTree(caseId?: string) {
  return useAsync(
    () => familyMembersService.getTree(caseId as string),
    [caseId],
    !!caseId,
  );
}

export function useFamilyMember(id: string) {
  return useAsync(() => familyMembersService.findOne(id), [id], !!id);
}

export function useCreateFamilyMember() {
  const { mutate, loading, error, reset } = useMutation(
    (dto: CreateFamilyMemberDto) => familyMembersService.create(dto),
  );
  return { createMember: mutate, loading, error, reset };
}

export function useUpdateFamilyMember(id: string) {
  const { mutate, loading, error, reset } = useMutation(
    (dto: UpdateFamilyMemberDto) => familyMembersService.update(id, dto),
  );
  return { updateMember: mutate, loading, error, reset };
}

export function useDeleteFamilyMember() {
  const { mutate, loading, error, reset } = useMutation((id: string) =>
    familyMembersService.remove(id),
  );
  return { deleteMember: mutate, loading, error, reset };
}
