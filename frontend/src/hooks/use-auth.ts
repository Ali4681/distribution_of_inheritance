"use client";

import { useMutation } from "@/lib";
import { authService } from "@/services";
import { SignInDto, SignUpDto, EditUserDto } from "@/types";
import { useCallback } from "react";


export function useSignIn() {
  const { mutate, loading, error, reset } = useMutation(authService.signIn);

  const signIn = useCallback(
    async (dto: SignInDto) => {
      const result = await mutate(dto);
      authService.saveToken(result.token);
      return result;
    },
    [mutate],
  );

  return { signIn, loading, error, reset };
}

export function useSignUp() {
  const { mutate, loading, error, reset } = useMutation(authService.signUp);

  const signUp = useCallback(
    async (dto: SignUpDto) => {
      const result = await mutate(dto);
      authService.saveToken(result.token);
      return result;
    },
    [mutate],
  );

  return { signUp, loading, error, reset };
}

export function useSignOut() {
  return useCallback(() => {
    authService.removeToken();
  }, []);
}

export function useIsAuthenticated() {
  return authService.isAuthenticated();
}

export function useEditAuthDetails(userId: string) {
  const { mutate, loading, error, reset } = useMutation((dto: EditUserDto) =>
    authService.editDetails(userId, dto),
  );
  return { editDetails: mutate, loading, error, reset };
}
