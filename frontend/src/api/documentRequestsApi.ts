import { client } from './client';

export type DocumentRequestStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'rejected';

export type DocumentRequest = {
  id: number;
  requester_id: number;
  requester_name?: string;
  requester_email?: string;
  requester_role?: string;
  requester_poste?: string;
  requester_departement?: string;
  requester_date_recrutement?: string;
  document_type: string;
  motif?: string;
  details?: string;
  status: DocumentRequestStatus;
  secretary_comment?: string;
  generated_file_path?: string;
  created_at?: string;
  updated_at?: string;
  processed_by?: number;
  processed_at?: string;
  ready_at?: string;
  delivered_at?: string;
};

export type DocumentRequestCreatePayload = {
  document_type: string;
  motif?: string;
  details?: string;
};

export type DocumentRequestStatusPayload = {
  status: DocumentRequestStatus;
  secretary_comment?: string;
};

export type DocumentRequestGeneratePayload = {
  details_override?: string;
  optimiser_ia?: boolean;
  requester_name_override?: string;
  requester_email_override?: string;
  requester_role_override?: string;
  poste_override?: string;
  departement_override?: string;
  date_recrutement_override?: string;
  motif_override?: string;
};

export type DocumentRequestPrepareAiPayload = {
  requester_name?: string;
  requester_email?: string;
  requester_role?: string;
  poste?: string;
  departement?: string;
  date_recrutement?: string;
  motif?: string;
  details?: string;
};

export type DocumentRequestPrepareAiResponse = {
  details: string;
  moteur: string;
};

export const documentRequestsApi = {
  createDocumentRequest: async (payload: DocumentRequestCreatePayload) => {
    const { data } = await client.post<DocumentRequest>('/api/document-requests', payload);
    return data;
  },

  getMyDocumentRequests: async () => {
    const { data } = await client.get<DocumentRequest[]>('/api/document-requests/me');
    return data;
  },

  getMyMeetings: async () => {
    const { data } = await client.get<DocumentRequest[]>('/api/my-meetings');
    return data;
  },

  getAllDocumentRequests: async () => {
    const { data } = await client.get<DocumentRequest[]>('/api/document-requests');
    return data;
  },

  getDocumentRequestById: async (id: number) => {
    const { data } = await client.get<DocumentRequest>(`/api/document-requests/${id}`);
    return data;
  },

  updateDocumentRequestStatus: async (id: number, payload: DocumentRequestStatusPayload) => {
    const { data } = await client.patch<DocumentRequest>(`/api/document-requests/${id}/status`, payload);
    return data;
  },

  generateDocumentFromRequest: async (id: number, payload: DocumentRequestGeneratePayload = {}) => {
    const { data } = await client.post<DocumentRequest>(`/api/document-requests/${id}/generate`, payload);
    return data;
  },

  prepareDocumentRequestWithAi: async (id: number, payload: DocumentRequestPrepareAiPayload) => {
    const { data } = await client.post<DocumentRequestPrepareAiResponse>(`/api/document-requests/${id}/prepare-ai`, payload);
    return data;
  },
};
