import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0B1120] overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-500">
      {/* Sidebar with smooth slide animation */}
      <div
        className={`shrink-0 transition-all duration-400 ease-in-out overflow-hidden ${
          sidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Toggle button – always visible on the left edge */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-[1.15rem] left-3 z-40 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 active:scale-90"
          title={sidebarOpen ? 'Masquer le menu' : 'Afficher le menu'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>

        <Header />
        
        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0B1120]/60 relative">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}