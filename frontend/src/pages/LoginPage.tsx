import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, Moon, ShieldAlert, ShieldCheck, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { client } from '../api/client';

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
      navigate('/dashboard', { replace: true });
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
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="hidden lg:flex flex-col justify-between border-r border-slate-200 bg-white px-12 py-10 dark:border-slate-850 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest">Secretariat</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">General Portal</p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acces securise V1
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Portail interne du Secretariat General
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Gestion des demandes, documents officiels, proces-verbaux, reunions et historique administratif dans un espace controle par roles.
            </p>
          </div>

          <p className="text-xs text-slate-500">Smart Automation Technologies - Systeme administratif interne</p>
        </aside>

        <main className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:justify-end">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Secretariat</p>
                  <p className="text-[10px] font-bold uppercase text-slate-500">General Portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Authentification
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Connexion au portail</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Utilisez vos identifiants professionnels pour acceder a votre espace.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={gererConnexion} className="space-y-5">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Adresse e-mail professionnelle
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="username"
                      placeholder="nom@entreprise.ma"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Authentification...' : 'Se connecter'}
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
