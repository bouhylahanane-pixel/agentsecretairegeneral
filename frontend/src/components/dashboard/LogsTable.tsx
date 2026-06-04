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
        return 'bg-rose-50 text-rose-700 border-rose-100 font-bold';
      case 'Moyenne':
        return 'bg-amber-50 text-amber-700 border-amber-100 font-semibold';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
      <h3 className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
        Journal des actions & sécurité système
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              <th className="pb-3 pl-2">Utilisateur</th>
              <th className="pb-3">Action système</th>
              <th className="pb-3">Priorité</th>
              <th className="pb-3 text-right pr-2">Horodatage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                  Aucun log enregistré dans la session courante
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pl-2 font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                      <User className="w-3 h-3" />
                    </div>
                    {log.utilisateur}
                  </td>
                  <td className="py-3 text-slate-600 max-w-xs truncate">{log.action}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border ${getPriorityStyle(log.priorite)}`}>
                      {log.priorite}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2 text-slate-400 font-mono text-[11px]">
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