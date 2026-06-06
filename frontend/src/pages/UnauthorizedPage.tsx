import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Accès non autorisé</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <Link 
        to="/dashboard" 
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Retour au Dashboard
      </Link>
    </div>
  );
}
