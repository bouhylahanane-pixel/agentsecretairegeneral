import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, CheckCircle, Clock, AlertTriangle, Shield, FileText, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../api/dashboardApi';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdminOrSec = user?.role === 'admin' || user?.role === 'secretaire';
  const isEmployee = user?.role === 'employee';
  const isStagiaire = user?.role === 'stagiaire';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // All users can see stats
      const statsData = await dashboardApi.getDashboardStats();
      setStats(statsData);

      // Only admin/secretaire can see charts and logs
      if (isAdminOrSec) {
        const [chartRes, logsRes] = await Promise.all([
          dashboardApi.getDashboardChart(),
          dashboardApi.getActivityLogs()
        ]);
        setChartData(chartRes);
        setLogs(logsRes || []);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la récupération des données du dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
            Vue d'ensemble
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Dashboard de pilotage du Secrétariat Général
          </p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {isStagiaire && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> Accès consultation uniquement.
        </div>
      )}

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
            <p className="text-[10px] uppercase font-bold text-slate-500">Urgences</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.total_urgencies || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle className="w-6 h-6"/></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Décisions PV</p>
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

      {isEmployee && (
        <div className="bg-white dark:bg-slate-900/40 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Espace Employé</h3>
          <p className="text-xs text-slate-500">
            Bienvenue sur votre espace de travail. Vos fonctionnalités sont limitées à la consultation et au suivi de demandes de documents depuis le menu Documents.
          </p>
        </div>
      )}

      {isAdminOrSec && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Simple Chart Visualization based on chartData */}
          <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-4">Répartition des actions (Chart Data)</h3>
            {chartData ? (
              <div className="space-y-4">
                {Object.entries(chartData).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300 capitalize">{key}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{String(value)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min((Number(value) / 50) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Aucune donnée graphique disponible.</p>
            )}
          </div>

          {/* Activity Logs */}
          <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-96">
            <h3 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-4">Activité récente (Logs)</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {logs.length > 0 ? logs.map((log: any, idx: number) => (
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
      )}

    </div>
  );
}
