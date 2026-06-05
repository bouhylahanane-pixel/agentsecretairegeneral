import { ShieldAlert, User } from 'lucide-react';
import type { ActivityLog } from '../../types';

interface LogsTableProps {
  logs: ActivityLog[];
}

export default function LogsTable({ logs }: LogsTableProps) {
  // Helper pour styliser dynamiquement les badges de priorité de sécurité
  const getPriorityStyle = (priority: ActivityLog['priorite']) => {
    switch (priority) {
      case 'Haute':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50 font-bold';
      case 'Moyenne':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50 font-semibold';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors duration-300">
      <h3 className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2 transition-colors duration-300">
        <ShieldAlert className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 transition-colors duration-300" />
        Journal des actions & sécurité système
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold transition-colors duration-300">
              <th className="pb-3 pl-2">Utilisateur</th>
              <th className="pb-3">Action système</th>
              <th className="pb-3">Priorité</th>
              <th className="pb-3 text-right pr-2">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs transition-colors duration-300">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 italic transition-colors duration-300">
                  Aucun log enregistré dans la session courante
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors duration-300">
                  <td className="py-3 pl-2 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors duration-300">
                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors duration-300">
                      <User className="w-3 h-3" />
                    </div>
                    {log.utilisateur}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate transition-colors duration-300">{log.action}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors duration-300 ${getPriorityStyle(log.priorite)}`}>
                      {log.priorite}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2 text-slate-400 dark:text-slate-500 font-mono text-[11px] transition-colors duration-300">
                    {log.timestamp}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}