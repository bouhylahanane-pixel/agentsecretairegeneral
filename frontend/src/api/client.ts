import axios from 'axios';

/** URL de l'API FastAPI — configurable via import.meta.env (Vite) */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 900000, // 15 minutes max pour les traitements lourds (fichiers audio, PDF)
});

let onNetworkErrorCallback: (() => void) | null = null;

export function registerNetworkErrorCallback(callback: () => void) {
  onNetworkErrorCallback = callback;
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si pas de réponse du serveur ou si code erreur de réseau (comme ERR_CONNECTION_REFUSED)
    if (!error.response || error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      if (onNetworkErrorCallback) {
        onNetworkErrorCallback();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Reconstruit l'URL complète d'un fichier à partir de son chemin serveur
 * @param path Chemin relatif (ex: 'static/pv_123.pdf') ou absolu
 */
export function getDownloadUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/download/${encodeURIComponent(cleanPath)}`;
}