import { client } from './client';

export const meetingsApi = {
  getMeetings: async () => {
    const { data } = await client.get('/meetings');
    return data;
  },
  createMeeting: async (payload: { titre: string; date: string; heure: string; participants: string; objet: string }) => {
    const { data } = await client.post('/meetings/create', payload);
    return data;
  },
  deleteMeeting: async (id: number) => {
    const { data } = await client.delete(`/meetings/delete/${id}`);
    return data;
  },
  triggerInvitations: async (payload: { id?: number; titre: string; date: string; heure?: string; objet?: string; participants?: string }) => {
    const { data } = await client.post('/meetings/trigger-invitations', payload);
    return data;
  },
  getMeetingsHistory: async () => {
    const { data } = await client.get('/meetings/history');
    return data;
  }
};
