import { client } from './client';

export const pvApi = {
  // Option 1: Live Record -> Stream
  generatePv: async (audioBlob: Blob) => {
    // Send as raw body if backend uses `request.stream()`
    // We set headers manually for raw upload
    const response = await client.post('/agent/generate-pv', audioBlob, {
      headers: {
        'Content-Type': 'application/octet-stream',
      }
    });
    return response.data;
  },

  // Option 2: Upload File -> Stream with X-File-Name
  uploadPv: async (file: File) => {
    const response = await client.post('/agent/upload-pv', file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name)
      }
    });
    return response.data;
  },

  transcribeAudio: async (audioBlob: Blob) => {
    const response = await client.post('/agent/transcribe', audioBlob, {
      headers: {
        'Content-Type': 'application/octet-stream',
      }
    });
    return response.data;
  },

  structureText: async (text: string) => {
    const response = await client.post('/agent/structure-text', { text });
    return response.data;
  },

  getMeetingsHistory: async () => {
    const response = await client.get('/meetings/history');
    return response.data;
  },

  downloadGeneratedFile: async (filePath: string) => {
    const response = await client.get(`/download/${encodeURIComponent(filePath)}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filePath.split('/').pop() || 'document.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
