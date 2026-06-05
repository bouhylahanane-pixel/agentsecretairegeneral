export interface Meeting {
  id: number;
  titre: string;
  date: string;
  heure: string;
  lieu?: string;
}

export interface PVHistory {
  id: number;
  objet: string;
  date: string;
  participants: string;
  decisions: string[];
  actions: string[];
}

export interface AnalyticsStats {
  total_requests: number;
  total_urgencies: number;
  average_response_time_ms: number;
}

export interface ActivityLog {
  id: number;
  action: string;
  utilisateur: string;
  priorite: 'Basse' | 'Moyenne' | 'Haute';
  timestamp: string;
}

export interface AgentResponse {
  result: string;
  response?: string;
  action?: string;
  pdf_path?: string;
  audio_path?: string;
}

export interface PVResult {
  transcription?: string;
  pv_markdown: string;
  pv_html?: string;
  pdf_path?: string;
  nom_fichier?: string;
  nom_fichier_md?: string;
  decisions?: string[];
  actions?: string[];
  date?: string;
  participants?: string;
  moteur?: string;
}

export interface EmailAnalysis {
  classification: 'Urgent' | 'Routine' | 'Légal';
  score_confiance: number;
  resume: string;
  analyse_detaillee: string;
  actions_recommandees: string[];
  delai_reponse_suggere: string;
  moteur: string;
}

export interface DemandeEntrante {
  id: string | number;
  from: string;
  subject: string;
  date: string;
  urgency: string;
  email_brut: string;
}

export interface Notification {
  id: string | number;
  type: string;
  text: string;
  time: string;
}

export interface InstanceCommittee {
  id: string;
  nom: string;
  type: string;
  description: string;
  membres?: string;
  reunions: InstanceMeeting[];
}

export interface InstanceMeeting {
  id: string;
  titre: string;
  date: string;
  heure: string;
  lieu: string;
  statut: string;
}

export interface InstanceTree {
  committees: InstanceCommittee[];
  meta: { derniere_mise_a_jour: string; version: number };
}

export interface ExtractedTask {
  qui: string;
  quoi: string;
  quand: string;
  priorite: string;
}

export interface TasksExtractionResult {
  taches: ExtractedTask[];
  synthese: string;
  nombre_taches: number;
  moteur: string;
}