import { client } from './client';

export type UserRole = "admin" | "secretaire" | "employee" | "stagiaire";

export type UserResponse = {
  id: number;
  nom: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_login?: string | null;
};

export const usersApi = {
  getUsers: async (params?: { search?: string; role?: UserRole | ""; is_active?: boolean | "" }): Promise<UserResponse[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.is_active !== undefined && params?.is_active !== "") query.append('is_active', params.is_active ? 'true' : 'false');
    
    // Add cache buster to prevent returning old cached roles
    query.append('_t', Date.now().toString());
    
    const { data } = await client.get(`/api/users?${query.toString()}`);
    return data;
  },
  createUser: async (payload: any): Promise<UserResponse> => {
    const { data } = await client.post('/api/users', payload);
    return data;
  },
  getUserById: async (userId: number): Promise<UserResponse> => {
    const { data } = await client.get(`/api/users/${userId}`);
    return data;
  },
  updateUser: async (userId: number, payload: any): Promise<UserResponse> => {
    const { data } = await client.put(`/api/users/${userId}`, payload);
    return data;
  },
  updateUserStatus: async (userId: number, is_active: boolean): Promise<UserResponse> => {
    const { data } = await client.patch(`/api/users/${userId}/status`, { is_active });
    return data;
  },
  updateUserRole: async (userId: number, role: string): Promise<UserResponse> => {
    const { data } = await client.patch(`/api/users/${userId}/role`, { role });
    return data;
  },
  resetUserPassword: async (userId: number, payload: any): Promise<any> => {
    const { data } = await client.post(`/api/users/${userId}/reset-password`, payload);
    return data;
  }
};
