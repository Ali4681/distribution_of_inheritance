import { apiGet, apiPatch, apiDelete } from "@/lib";
import { User, UpdateUserDto, DeleteResponse } from "@/types";


export const usersService = {
  /** GET /users/me */
  getMe(): Promise<User> {
    return apiGet<User>("/users/me");
  },

  /** GET /users — ADMIN only */
  findAll(): Promise<User[]> {
    return apiGet<User[]>("/users");
  },

  /** GET /users/:id — ADMIN only */
  findOne(id: string): Promise<User> {
    return apiGet<User>(`/users/${id}`);
  },

  /** PATCH /users/:id — ADMIN only */
  update(id: string, dto: UpdateUserDto): Promise<User> {
    return apiPatch<User>(`/users/${id}`, dto);
  },

  /** DELETE /users/:id — ADMIN only */
  remove(id: string): Promise<DeleteResponse> {
    return apiDelete<DeleteResponse>(`/users/${id}`);
  },
};
