import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Clock, BrainCircuit, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, Sun, Moon, LogOut } from 'lucide-react';
import { useApiError } from '../../contexts/ApiErrorContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/endpoints';
import { API_URL } from '../../config';
import type { Notification } from '../../types';

export default function Header() {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const { isBackendOffline, setBackendOffline } = useApiError();
  const { logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Theme toggle state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return true; // Default to dark as per existing UI
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Impossible de charger les notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifs();
    }
  }, [showNotifications]);

  const formatNotificationTime = (value: string) => {
    if (!value) return 'Maintenant';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getViewTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard Overview';
      case '/meetings':
        return 'Meetings & Instances';
      case '/pv-generator':
        return 'Minutes & Task Extraction';
      case '/document-safe-and-logs':
        return 'Document Safe & Logs';
      case '/document-generation':
        return 'Génération de Documents';
      default:
        return 'Portail Général';
    }
  };



  const handleRetryConnection = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`${API_URL}/health`, { method: 'GET' });
      if (res.ok) {
        setBackendOffline(false);
      }
    } catch (err) {
      console.log('Backend still offline...');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex flex-col shrink-0 z-30">
      {/* Offline Alert Banner */}
      {isBackendOffline && (
        <div className="bg-rose-900/80 backdrop-blur-md border-b border-rose-800 text-rose-100 px-4 py-2 text-xs flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-450 animate-bounce" />
            <span>
              <strong>Serveur FastAPI Hors Ligne :</strong> Impossible de joindre l'API à <code>{API_URL}</code>. Veuillez vous assurer que le serveur backend est démarré.
            </span>
          </div>
          <button
            onClick={handleRetryConnection}
            disabled={retrying}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-950 hover:bg-rose-900 active:scale-95 text-rose-200 rounded-lg border border-rose-800 transition-all font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Tentative...' : 'Réessayer'}
          </button>
        </div>
      )}

      <header className="h-16 bg-white dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-8 shadow-sm dark:shadow-lg relative transition-colors duration-300">
        {/* Dynamic Page Title */}
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-wide uppercase transition-colors duration-300">
            {getViewTitle()}
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 transition-colors duration-300 truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
            Secrétariat Général de Smart Automation Technologies
          </p>
        </div>

        {/* System Details & Notifications */}
        <div className="flex items-center gap-6">
          
          {/* Live system clock */}
          <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px] font-semibold bg-slate-50 dark:bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
            <span>{time.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
            <span className="text-slate-300 dark:text-slate-800">|</span>
            <span className="text-slate-900 dark:text-white font-bold transition-colors duration-300">{time.toLocaleTimeString('fr-FR')}</span>
          </div>

          {/* AI Status Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl transition-colors duration-300">
            <div className="relative flex">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1 transition-colors duration-300">
              <BrainCircuit className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 transition-colors duration-300" />
              LLA-MA 3.3 ACTIVE
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800/80 transition-all active:scale-95 flex items-center justify-center bg-white dark:bg-transparent"
            title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800/80 transition-all active:scale-95 flex items-center justify-center bg-white dark:bg-transparent"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              )}
            </button>

            {/* Dropdown list */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl dark:shadow-2xl z-50 p-4 divide-y divide-slate-100 dark:divide-slate-800/80 transition-colors duration-300">
                <div className="flex justify-between items-center pb-2.5 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Centre d'Alertes</span>
                  <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md font-bold border border-indigo-100 dark:border-indigo-500/20">{notifications.length} alertes</span>
                </div>
                
                <div className="space-y-2.5 pt-2.5 max-h-64 overflow-y-auto">
                  {notifications.length === 0 && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Aucune alerte réelle enregistrée pour le moment.
                    </div>
                  )}
                  {notifications.map((notif) => (
                    <div key={notif.id} className="flex gap-2.5 text-left text-xs p-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors">
                      {notif.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : notif.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-450 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-normal">{notif.text}</p>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 block mt-1">{formatNotificationTime(String(notif.time || ''))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 text-rose-500 dark:text-rose-450 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 transition-all active:scale-95 flex items-center justify-center bg-white dark:bg-transparent"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>
      </header>
    </div>
  );
}
