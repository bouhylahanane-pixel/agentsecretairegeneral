import { client } from './client';

export const historiqueApi = {
  getActivityLogs: async () => {
    const { data } = await client.get('/analytics/logs');
    return data;
  }
};
