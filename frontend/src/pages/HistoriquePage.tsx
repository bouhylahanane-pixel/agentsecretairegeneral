import React, { useState, useEffect } from 'react';
import { Activity, Search, AlertTriangle, Loader2, Database } from 'lucide-react';
import { historiqueApi } from '../api/historiqueApi';

export default function HistoriquePage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await historiqueApi.getActivityLogs();
      const logsArray = Array.isArray(data) ? data : [];
      setLogs(logsArray);
      setFilteredLogs(logsArray);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la récupération de l'historique.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLogs(logs);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = logs.filter(log => 
      (log.action && log.action.toLowerCase().includes(lower)) ||
      (log.user && log.user.toLowerCase().includes(lower)) ||
      (log.details && log.details.toLowerCase().includes(lower))
    );
    setFilteredLogs(filtered);
  }, [searchTerm, logs]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            Journal d'activité
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Suivi des actions réalisées dans l'application
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
        
        {/* Barre de recherche locale */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une action ou un utilisateur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tableau des logs */}
        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Date / Heure</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Utilisateur</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Action</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 hidden sm:table-cell">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                    Aucun journal d'activité trouvé.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {log.date || log.timestamp || "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-bold">
                        {log.user || log.agent || "Système"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.action || log.message || "Action inconnue"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}
