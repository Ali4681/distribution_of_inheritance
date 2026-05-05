import { apiPost, apiPut } from "@/lib";
import { SignInDto, AuthResponse, SignUpDto, SignUpResponse, EditUserDto, EditUserResponse } from "@/types";

export const AUTH_TOKEN_EVENT = "auth-token-change";

function emitAuthTokenChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_TOKEN_EVENT));
  }
}

export const authService = {
  /** POST /auth/signin */
  signIn(dto: SignInDto): Promise<AuthResponse> {
    return apiPost<AuthResponse>("/auth/signin", dto);
  },

  /** POST /auth/signup */
  signUp(dto: SignUpDto): Promise<SignUpResponse> {
    return apiPost<SignUpResponse>("/auth/signup", dto);
  },

  /** PUT /auth/edit/:id */
  editDetails(id: string, dto: EditUserDto): Promise<EditUserResponse> {
    return apiPut<EditUserResponse>(`/auth/edit/${id}`, dto);
  },

  saveToken(token: string): void {
    localStorage.setItem("auth_token", token);
    emitAuthTokenChange();
  },

  removeToken(): void {
    localStorage.removeItem("auth_token");
    emitAuthTokenChange();
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  },

  isAuthenticated(): boolean {
    return !!authService.getToken();
  },
};
