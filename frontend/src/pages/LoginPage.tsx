import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { ShieldAlert, LogIn, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const gererConnexion = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('L\'adresse e-mail professionnelle est requise.');
      return;
    }
    if (!password) {
      setError('Le mot de passe de sécurité est requis.');
      return;
    }
    
    setLoading(true);
    // Simulate slight network validation
    setTimeout(() => {
      login({ 
        name: 'Hanane Bouhyla', 
        email: email, 
        role: 'Administrateur' 
      });
      setLoading(false);
    }, 600);
  };

  const handleDemoLogin = () => {
    setEmail('hanane.bouhyla@entreprise.ma');
    setPassword('secretariat2026');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans antialiased text-slate-100">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-650/15 rounded-full blur-3xl animate-pulse-subtle"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-650/15 rounded-full blur-3xl animate-float"></div>

      <div className="w-full max-w-md p-8 bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-3xl shadow-2xl z-10 transition-all duration-300 hover:border-slate-700/60">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4 text-indigo-400 shadow-inner">
            <LogIn className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Secrétariat Général
          </h1>
          <p className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase mt-1">
            General Corporate Secretariat Portal
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-350 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-455" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={gererConnexion} className="space-y-5">
          {/* Email input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Identifiant professionnel</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                placeholder="ex: hanane@entreprise.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-550 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mot de passe d'accès</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-550 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 active:scale-[0.98] text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-lg shadow-indigo-655/15 transition-all duration-150 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Authentification...' : 'Se connecter'}
          </button>
        </form>

        {/* Demo Helper */}
        <div className="mt-6 border-t border-slate-850 pt-5 text-center">
          <p className="text-[10px] text-slate-500 font-semibold mb-2">Première visite ? Testez la version de démonstration</p>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-350 transition-colors uppercase tracking-wider underline underline-offset-4"
          >
            Pré-remplir les accès Admin
          </button>
        </div>
      </div>
    </div>
  );
}