import { client } from './client';

export interface ConfigKey {
  key_id: string;
  env_name: string;
  has_value: boolean;
  masked_value: string;
}

export const configApi = {
  getKeys: async (): Promise<ConfigKey[]> => {
    const { data } = await client.get('/api/config/keys');
    return data;
  },

  updateKey: async (key_id: string, value: string) => {
    const { data } = await client.put(`/api/config/keys/${key_id}`, { key_id, value });
    return data;
  },

  updateAllKeys: async (updates: { key_id: string; value: string }[]) => {
    const { data } = await client.put('/api/config/keys', { updates });
    return data;
  },
};
