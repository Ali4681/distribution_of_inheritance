"use client";

import { useAsync, useMutation } from "@/lib";
import { casesService } from "@/services";
import { CreateCaseDto, UpdateCaseDto } from "@/types";



export function useCases() {
  return useAsync(() => casesService.findAll(), []);
}

export function useCase(id: string) {
  return useAsync(() => casesService.findOne(id), [id], !!id);
}

export function useCreateCase() {
  const { mutate, loading, error, reset } = useMutation((dto: CreateCaseDto) =>
    casesService.create(dto),
  );
  return { createCase: mutate, loading, error, reset };
}

export function useUpdateCase(id: string) {
  const { mutate, loading, error, reset } = useMutation((dto: UpdateCaseDto) =>
    casesService.update(id, dto),
  );
  return { updateCase: mutate, loading, error, reset };
}

export function useDeleteCase() {
  const { mutate, loading, error, reset } = useMutation((id: string) =>
    casesService.remove(id),
  );
  return { deleteCase: mutate, loading, error, reset };
}
