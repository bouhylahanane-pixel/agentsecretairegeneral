import { client } from './client';

export const documentsApi = {
  generateDocument: async (payload: { type: string; nom: string; details?: string; optimiser_ia: boolean }) => {
    const { data } = await client.post('/api/documents/generate', payload);
    return data;
  },
  
  getDownloadUrl: (filePath: string) => {
    // Assuming backend runs on a known URL or relative. With Vite, /download is proxied or relative.
    // We can also just fetch the blob using client.get to pass the token automatically.
    return `/download/${encodeURIComponent(filePath)}`;
  },

  downloadDocument: async (filePath: string) => {
    // Better way to handle auth-protected downloads:
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
