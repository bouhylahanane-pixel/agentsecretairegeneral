import { client } from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await client.post('/api/auth/login', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await client.get('/api/auth/me');
    return response.data;
  }
};
