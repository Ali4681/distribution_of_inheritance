"use client";

import { useAsync, useMutation } from "@/lib";
import { usersService } from "@/services";
import { UpdateUserDto } from "@/types";


export function useMe() {
  return useAsync(() => usersService.getMe(), []);
}

export function useUsers() {
  return useAsync(() => usersService.findAll(), []);
}

export function useUser(id: string) {
  return useAsync(() => usersService.findOne(id), [id], !!id);
}

export function useUpdateUser(id: string) {
  const { mutate, loading, error, reset } = useMutation((dto: UpdateUserDto) =>
    usersService.update(id, dto),
  );
  return { updateUser: mutate, loading, error, reset };
}

export function useDeleteUser() {
  const { mutate, loading, error, reset } = useMutation((id: string) =>
    usersService.remove(id),
  );
  return { deleteUser: mutate, loading, error, reset };
}
