import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Composant de navigation latéral gauche fixe */}
      <Sidebar />
      
      {/* Bloc de contenu droit (Bandeau supérieur + Zone de la page courante) */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <Header />
        
        {/* Zone de contenu principale défilable verticalement */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/60 relative">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}