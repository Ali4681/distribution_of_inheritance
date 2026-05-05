import { Role } from "./enums";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface SignUpDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface EditUserDto {
  name?: string;
  email?: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: AuthPayload;
}

export interface SignUpResponse {
  status: boolean;
  message: string;
  token: string;
  user: AuthPayload;
}

export interface EditUserResponse {
  status: boolean;
  message: string;
  user: AuthPayload;
}
