import { client } from './client';

export const documentsApi = {
  generateDocument: async (payload: { 
    type: string; 
    nom: string; 
    details?: string; 
    optimiser_ia: boolean;
    email?: string;
    requester_role?: string;
    poste?: string;
    departement?: string;
    date_recrutement?: string;
    motif?: string;
    entreprise?: string;
    service?: string;
    encadrant?: string;
    date_debut?: string;
    date_fin?: string;
    heure?: string;
    lieu?: string;
    objet?: string;
    participants?: string;
    recruteur?: string;
    salle?: string;
  }) => {
    const { data } = await client.post('/api/documents/generate', payload);
    return data;
  },
  
  getDocumentUsers: async () => {
    const { data } = await client.get('/api/documents/users');
    return data;
  },

  sendDocumentByEmail: async (payload: { email: string; nom: string; type: string; pdf_path: string }) => {
    const { data } = await client.post('/api/documents/send-email', payload);
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
