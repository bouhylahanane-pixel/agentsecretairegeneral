import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, Moon, ShieldAlert, ShieldCheck, Sun, Inbox, FileText, History, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { client } from '../api/client';
import { getDefaultRoute } from '../auth/permissions';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    root.classList.toggle('light', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const gererConnexion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError("L'adresse e-mail professionnelle est requise.");
      return;
    }
    if (!password) {
      setError("Le mot de passe est requis.");
      return;
    }

    setLoading(true);
    try {
      const response = await client.post('/api/auth/login', {
        email: email.trim(),
        password,
      });

      const { user, access_token } = response.data;
      login(user, access_token);
      navigate(getDefaultRoute(user.role), { replace: true });
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError('Identifiants incorrects.');
      } else {
        setError('Erreur de connexion au serveur.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B0F19] dark:text-slate-100 transition-colors font-sans selection:bg-indigo-500/30">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        
        {/* Left Panel: Vibrant, Dynamic Gradient */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-14 text-white">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-900 z-0"></div>
          {/* Glowing Orbs for dynamic feel */}
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-blue-500/30 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-20%] w-[40rem] h-[40rem] rounded-full bg-pink-500/30 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] border-2 border-white/30 backdrop-blur-md shrink-0 bg-white">
              <img src="/logo.png" alt="Smart Org Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white/90">Secrétariat</p>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">General Portal</p>
            </div>
          </div>

          <div className="relative z-10 max-w-lg mt-auto mb-auto">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-transform hover:scale-105 cursor-default">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Accès ultra-sécurisé V1
            </div>
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight mb-8">
              Portail intelligent<br />du Secrétariat.
            </h1>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:translate-x-1 cursor-default">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/30 text-indigo-200">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-white/90">Gestion intelligente des demandes entrantes</p>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:translate-x-1 cursor-default">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/30 text-purple-200">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-white/90">Génération de documents et PVs officiels</p>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:translate-x-1 cursor-default">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/30 text-blue-200">
                  <History className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-white/90">Historique administratif traçable et sécurisé</p>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:translate-x-1 cursor-default">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-200">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-white/90">Espace collaboratif avec accès par rôles</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs font-medium text-indigo-200/60 uppercase tracking-widest">
            Smart Automation Technologies © {new Date().getFullYear()}
          </p>
        </aside>

        {/* Right Panel: Clean, Modern Form */}
        <main className="flex min-h-screen items-center justify-center px-6 py-10 relative">
          
          {/* Subtle background glow for right side */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="w-full max-w-md relative z-10">
            <div className="mb-10 flex items-center justify-between lg:justify-end">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="h-10 w-10 overflow-hidden rounded-xl shadow-lg border border-indigo-100 dark:border-slate-800 shrink-0 bg-white">
                  <img src="/logo.png" alt="Smart Org Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Secrétariat</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">General Portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-md text-slate-600 shadow-sm transition-all hover:bg-white hover:text-indigo-600 hover:scale-110 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <section className="rounded-3xl border border-slate-200/60 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-slate-200/40 dark:border-slate-800/60 dark:bg-[#111827]/80 dark:shadow-none transition-all">
              <div className="mb-8">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-2">
                  Authentification
                </p>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Bon retour,
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Connectez-vous pour accéder à votre espace sécurisé.
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 animate-in fade-in slide-in-from-top-2 duration-300">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={gererConnexion} className="space-y-6">
                <div className="group">
                  <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-colors group-focus-within:text-indigo-600 dark:text-slate-400 dark:group-focus-within:text-indigo-400">
                    Adresse e-mail professionnelle
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                    <input
                      type="email"
                      autoComplete="username"
                      placeholder="nom@entreprise.ma"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20 dark:hover:border-slate-700"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-colors group-focus-within:text-indigo-600 dark:text-slate-400 dark:group-focus-within:text-indigo-400">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20 dark:hover:border-slate-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-4 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authentification...
                    </span>
                  ) : (
                    'Accéder à mon espace'
                  )}
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
