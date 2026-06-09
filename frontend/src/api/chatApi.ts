import { client } from './client';

export const chatApi = {
  askRestrictedChat: async (message: string) => {
    const { data } = await client.post('/api/chat/restricted', { message });
    return data; // { response: string }
  },
  transcribeAudio: async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const { data } = await client.post('/api/chat/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data; // { text: string }
  },
};
