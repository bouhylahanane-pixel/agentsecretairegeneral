import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans antialiased text-slate-100">
      {/* Composant de navigation latéral gauche fixe */}
      <Sidebar />
      
      {/* Bloc de contenu droit (Bandeau supérieur + Zone de la page courante) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <Header />
        
        {/* Zone de contenu principale défilable verticalement */}
        <main className="flex-1 overflow-y-auto bg-slate-950/60 relative">
          {children}
        </main>
      </div>
    </div>
  );
}