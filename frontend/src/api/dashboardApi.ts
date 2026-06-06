import { client } from './client';

export const dashboardApi = {
  getDashboardStats: async () => {
    const { data } = await client.get('/analytics/stats');
    return data;
  },
  getDashboardChart: async () => {
    const { data } = await client.get('/analytics/chart');
    return data;
  },
  getActivityLogs: async () => {
    const { data } = await client.get('/analytics/logs');
    return data;
  }
};
