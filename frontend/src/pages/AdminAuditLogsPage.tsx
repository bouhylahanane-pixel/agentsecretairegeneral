import React, { useState, useEffect } from 'react';
import { 
  ScrollText, RefreshCw, Activity, CheckCircle, Clock, AlertTriangle, 
  Search, Terminal, Loader2, Shield, Users
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';

export default function AdminAuditLogsPage() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, chartRes, logsRes] = await Promise.all([
        dashboardApi.getDashboardStats(),
        dashboardApi.getDashboardChart(),
        dashboardApi.getActivityLogs(),
      ]);
      setStats(statsData);
      setChartData(chartRes);
      setLogs(logsRes || []);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la récupération des journaux d'audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm.trim()) return true;
    const lower = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(lower)) ||
      (log.user && log.user.toLowerCase().includes(lower)) ||
      (log.message && log.message.toLowerCase().includes(lower)) ||
      (log.agent && log.agent.toLowerCase().includes(lower))
    );
  });

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-rose-600" />
            Journaux d'Audit
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Traçabilité complète des sessions, requêtes et tâches du système.
          </p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Activity className="w-6 h-6"/></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Demandes Totales</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.total_requests || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg"><AlertTriangle className="w-6 h-6"/></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Alertes / Urgences</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.total_urgencies || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle className="w-6 h-6"/></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Opérations Réussies</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.total_decisions || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg"><Users className="w-6 h-6"/></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Réunions Planifiées</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.total_meetings || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Clock className="w-6 h-6"/></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Temps de réponse</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.average_response_time_ms || 0} ms</p>
          </div>
        </div>
      </div>

      {/* Chart + Logs side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Visualization */}
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-4">Répartition des actions système</h3>
          {chartData ? (
            <div className="space-y-4">
              {Object.entries(chartData).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700 dark:text-slate-300 capitalize">{key}</span>
                    <span className="text-rose-600 dark:text-rose-400">{String(value)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-rose-500 to-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min((Number(value) / 50) * 100, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Aucune donnée graphique disponible.</p>
          )}
        </div>

        {/* Recent Activity quick view */}
        <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-96">
          <h3 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-4">Activité récente</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {logs.length > 0 ? logs.slice(0, 15).map((log: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{log.action || log.message || "Action"}</span>
                  <span className="text-[9px] font-mono text-slate-400">{log.timestamp || log.date || "..."}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold">{log.user || log.agent || "Système"}</p>
              </div>
            )) : (
              <p className="text-xs text-slate-500 italic">Aucun log d'activité récent.</p>
            )}
          </div>
        </div>
      </div>

      {/* Full Audit Log Table */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Journal d'audit complet</h3>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Horodatage</th>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                    Aucune trace d'audit trouvée.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any, idx: number) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="px-6 py-3 font-mono text-[10px] text-slate-500">{log.timestamp || log.date || "N/A"}</td>
                    <td className="px-6 py-3">
                      <span className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded font-bold text-[10px]">
                        {log.user || log.agent || "Système"}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">
                      <code className="bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                        {log.action || log.message || "Action"}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{log.details || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance notice */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-3 text-xs text-slate-600 dark:text-slate-500 items-start">
        <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 dark:text-slate-400">Norme ISO/IEC 27001 :</strong> Toutes les requêtes d'administration sont authentifiées via JWT. Les transactions sont isolées et auditées en temps réel par les déclencheurs SQL.
        </div>
      </div>
    </div>
  );
}
