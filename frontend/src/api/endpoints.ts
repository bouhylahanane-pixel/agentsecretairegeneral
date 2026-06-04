import { client, API_BASE_URL } from './client';
import type {
  Meeting,
  PVHistory,
  AnalyticsStats,
  ActivityLog,
  AgentResponse,
  PVResult,
  EmailAnalysis,
  InstanceTree,
  TasksExtractionResult,
} from '../types';
import axios from 'axios';

export const api = {
  // --- Agent Conversationnel ---
  processMessage: (text: string, user: string) =>
    client.post<AgentResponse>('/agent/process', { message: text, utilisateur: user }),

  // --- Génération de PV & Traitement Audio ---
  uploadPVFile: (file: File) => {
    // Le backend attend un flux binaire brut avec le nom du fichier en en-tête
    return axios.post<PVResult>(`${API_BASE_URL}/agent/upload-pv`, file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': file.name,
      },
      timeout: 900000,
    });
  },

  generatePVFromMic: (audioBlob: Blob) => {
    // Le backend attend un flux binaire brut
    return axios.post<PVResult>(`${API_BASE_URL}/agent/generate-pv`, audioBlob, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 900000,
    });
  },

  transcribeAudio: (audioBlob: Blob) => {
    return axios.post<{ text: string }>(`${API_BASE_URL}/agent/transcribe`, audioBlob, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 900000,
    });
  },

  structureText: (text: string) => {
    return client.post<PVResult>('/agent/structure-text', { text });
  },

  // --- Moteur IA : analyse e-mail (LLaMA 3.3) ---
  analyzeEmail: (payload: { email_brut: string; expediteur?: string; sujet?: string }) =>
    client.post<EmailAnalysis>('/api/analyze-email', payload),

  // --- Génération PV structuré (Markdown + HTML) ---
  generateMinutes: (payload: {
    ordre_du_jour: string;
    participants: string[];
    notes_brutes: string;
    date_reunion?: string;
  }) => client.post<PVResult>('/api/generate-minutes', payload),

  // --- Extraction de tâches (Qui / Quoi / Quand) ---
  extractTasks: (texte_reunion: string) =>
    client.post<TasksExtractionResult>('/api/tasks/extract', { texte_reunion }),

  // --- Arborescence Instances (Comités → Réunions) ---
  getInstancesTree: () => client.get<InstanceTree>('/api/instances'),

  createCommittee: (nom: string, description?: string) =>
    client.post('/api/instances', { type: 'comite', nom, description: description ?? '' }),

  createInstanceMeeting: (
    committeeId: string,
    reunion: { titre: string; date: string; heure?: string; lieu?: string }
  ) =>
    client.post('/api/instances', {
      type: 'reunion',
      committee_id: committeeId,
      reunion: {
        titre: reunion.titre,
        date: reunion.date,
        heure: reunion.heure ?? '10:00',
        lieu: reunion.lieu ?? 'Salle de Réunion',
        statut: 'planifiee',
      },
    }),

  // --- Tableau de Bord / Analytics ---
  getStats: () => client.get<AnalyticsStats>('/analytics/stats'),
  getLogs: () => client.get<ActivityLog[]>('/analytics/logs'),
  getChartData: () => client.get<Record<string, number>>('/analytics/chart'),

  // --- Planning & Gestion des Réunions ---
  getMeetings: async (): Promise<Meeting[]> => {
    const res = await client.get('/meetings');
    const data = res.data;
    // Le backend renvoie une chaîne quand il n'y a pas de réunions
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return Array.isArray(data) ? data : [];
  },

  deleteMeeting: (id: number) => client.delete(`/meetings/delete/${id}`),

  createMeeting: (params: { date: string; heure: string; lieu?: string; objet: string; nom?: string }) =>
    client.post<{ message: string }>('/meetings/create', params),

  triggerInvitations: (meetingTitle: string, meetingDate: string) =>
    client.post<{ status: string; message: string }>('/meetings/trigger-invitations', { titre: meetingTitle, date: meetingDate }),

  getPVHistory: async (): Promise<PVHistory[]> => {
    const res = await client.get('/meetings/history');
    const rawData = res.data;
    if (typeof rawData === 'string') {
      try { return JSON.parse(rawData); } catch { return []; }
    }
    const parsed = Array.isArray(rawData) ? rawData : [];

    // S'assurer que les chaînes JSON complexes (décisions/actions) sont correctement parsées en tableaux
    return parsed.map((item: any) => ({
      ...item,
      decisions: typeof item.decisions === 'string' ? (() => { try { return JSON.parse(item.decisions); } catch { return []; } })() : (item.decisions || []),
      actions: typeof item.actions === 'string' ? (() => { try { return JSON.parse(item.actions); } catch { return []; } })() : (item.actions || []),
    }));
  },
};