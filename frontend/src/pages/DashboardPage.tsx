import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Mail, Calendar, ChevronRight, X, BellRing, AlertCircle, Sparkles } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useApiError } from '../contexts/ApiErrorContext';
import { api } from '../api/endpoints';
import KPICards from '../components/dashboard/KPICards';
import ActionChart from '../components/dashboard/ActionChart';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { API_URL } from '../config';
import type { Meeting, PVHistory, EmailAnalysis, DemandeEntrante } from '../types';

export default function Dashboard() {
  const { stats, chartData, loading: analyticsLoading, refresh } = useAnalytics();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [history, setHistory] = useState<PVHistory[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DemandeEntrante | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EmailAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { setBackendOffline } = useApiError();
  const [incomingRequests, setIncomingRequests] = useState<DemandeEntrante[]>([]);

  const loadExtraData = async () => {
    setLoadingExtra(true);
    try {
      const [meetingsRes, historyRes, demandesRes] = await Promise.all([
        api.getMeetings(),
        api.getPVHistory(),
        api.getDemandes(),
      ]);
      setMeetings(meetingsRes);
      setHistory(historyRes);
      setIncomingRequests(demandesRes);
      setBackendOffline(false);
    } catch (err: any) {
      console.error('Erreur lors du chargement des données supplémentaires:', err);
      if (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setBackendOffline(true);
      }
    } finally {
      setLoadingExtra(false);
    }
  };

  useEffect(() => {
    loadExtraData();
  }, [stats]);

  const handleRefresh = async () => {
    try {
      await Promise.all([refresh(), loadExtraData()]);
      setBackendOffline(false);
    } catch (err: any) {
      if (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setBackendOffline(true);
      }
    }
  };

  const handleAnalyze = async (req: DemandeEntrante) => {
    setSelectedRequest(req);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisLoading(true);
    try {
      const res = await api.analyzeEmail({
        email_brut: req.email_brut,
        expediteur: req.from,
        sujet: req.subject,
      });
      setAnalysisResult(res.data);
      setBackendOffline(false);
    } catch (err: any) {
      console.error(err);
      if (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setBackendOffline(true);
        setAnalysisError(`Impossible de joindre le moteur d'analyse. Le serveur API FastAPI à ${API_URL} est hors ligne.`);
      } else {
        setAnalysisError('Une erreur s\'est produite lors de l\'analyse de la demande.');
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH URGENCY':
        return 'bg-rose-950/40 border-rose-500/30 text-rose-455 font-bold';
      case 'LEGAL COMPLIANCE':
        return 'bg-emerald-950/40 border-emerald-500/30 text-emerald-455 font-bold';
      default:
        return 'bg-slate-950/40 border-slate-800 text-slate-400';
    }
  };

  const totalRequestsCount = stats?.total_requests ?? 0;
  const urgentRequestsCount = stats?.total_urgencies ?? 0;
  const extractedDecisionsCount = history.reduce(
    (acc, h) => acc + (h.decisions?.length || 0),
    0
  );
  const averageTime = stats?.average_response_time_ms ? `${stats.average_response_time_ms} ms` : '0 ms';

  const sortedUpcomingEvents = [...meetings]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const isLoading = analyticsLoading || loadingExtra;

  if (isLoading && meetings.length === 0 && !stats) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto bg-slate-950 min-h-screen text-slate-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="h-6 w-48 bg-slate-800 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-slate-800 rounded animate-pulse"></div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Title & Refresh Button */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-4 transition-colors duration-300">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight uppercase transition-colors duration-300">
            Gouvernance & Analytics Overview
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 transition-colors duration-300">
            Tableau de bord intelligent de pilotage du Secrétariat Général.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 rounded-xl text-[11px] font-bold active:scale-95 transition-all shadow-sm dark:shadow-md dark:shadow-indigo-950/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <KPICards
        totalRequests={totalRequestsCount}
        urgentRequests={urgentRequestsCount}
        extractedDecisions={extractedDecisionsCount}
        averageResponseTime={averageTime}
      />

      {/* Middle Layout section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Demandes Entrantes */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-3 transition-colors duration-300">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-2 transition-colors duration-300">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
                Demandes Entrantes & Urgence Classifier (LLaMA 3.3)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold mt-0.5 transition-colors duration-300">
                Mails entrants analysés et catégorisés automatiquement.
              </p>
            </div>
            <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20 font-mono transition-colors duration-300">
              LLaMA 3.3 Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-bold transition-colors duration-300">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Expéditeur</th>
                  <th className="pb-3">Sujet du Message</th>
                  <th className="pb-3">Classification IA</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 transition-colors duration-300">
                {incomingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/25 transition-colors duration-300">
                    <td className="py-3 pl-2 font-mono text-slate-500 font-semibold text-[10px] transition-colors duration-300">
                      {req.date}
                    </td>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-300 truncate max-w-[120px] transition-colors duration-300">
                      {req.from}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-medium max-w-[200px] truncate transition-colors duration-300">
                      {req.subject}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 text-[9px] rounded-full border ${getUrgencyBadge(req.urgency)}`}
                      >
                        {req.urgency}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        type="button"
                        onClick={() => handleAnalyze(req)}
                        className="inline-flex items-center gap-0.5 text-[10px] font-black tracking-wider uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-550/20 transition-all active:scale-95"
                      >
                        Analyser
                        <ChevronRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Notifications & Events */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Notifications sidebar pane */}
          <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-3 mb-4 transition-colors duration-300">
              <BellRing className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide uppercase transition-colors duration-300">Dernières Alertes</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 transition-colors duration-300">Alertes critiques détectées.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-500/10 rounded-xl transition-colors duration-300">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-350 leading-relaxed transition-colors duration-300">
                  High Urgency request detected: audit fiscal obligatoire exercice 2025.
                </p>
                <span className="text-[9px] font-bold text-slate-500 mt-1.5 block">Il y a 5 min</span>
              </div>
              
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-500/10 rounded-xl transition-colors duration-300">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-350 leading-relaxed transition-colors duration-300">
                  Minutes generated via ReportLab tool: PV_Conseil_2026-06-03.pdf.
                </p>
                <span className="text-[9px] font-bold text-slate-500 mt-1.5 block">Il y a 30 min</span>
              </div>
            </div>
          </div>

          {/* Upcoming Events (Calendar placeholder) */}
          <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-3 mb-4 transition-colors duration-300">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wide uppercase transition-colors duration-300">Upcoming Events</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 transition-colors duration-300">
                  Calendrier prévisionnel des instances.
                </p>
              </div>
            </div>

            <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2.5 space-y-5 transition-colors duration-300">
              {sortedUpcomingEvents.map((evt) => (
                <div key={evt.id} className="relative group">
                  <span className="absolute -left-[21.5px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 border-indigo-500 group-hover:bg-indigo-400 transition-colors" />
                  <div>
                    <span className="text-[9px] font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 transition-colors duration-300">
                      {evt.date}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 transition-colors duration-300">{evt.titre}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 transition-colors duration-300">
                      Salle de Conseil • Début à {evt.heure}
                    </p>
                  </div>
                </div>
              ))}
              {sortedUpcomingEvents.length === 0 && (
                <div className="text-center py-6 text-slate-500 dark:text-slate-550 italic text-xs transition-colors duration-300">
                  Aucun événement planifié.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Analytics Chart */}
      <div className="grid grid-cols-1 gap-6">
        <ActionChart data={chartData} />
      </div>

      {/* LLaMA Analyzer Modal Dialog */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl max-w-lg w-full rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto transition-colors duration-300">
            
            {/* Modal header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3 transition-colors duration-300">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors duration-300">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white transition-colors duration-300">
                  Classification IA LLaMA 3.3
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all border border-slate-200 dark:border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 transition-colors duration-300">Expéditeur</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-250 transition-colors duration-300">{selectedRequest.from}</p>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 transition-colors duration-300">Sujet du Message</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-400 transition-colors duration-300">{selectedRequest.subject}</p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3 transition-colors duration-300">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 transition-colors duration-300">Rapport d'analyse IA</span>
                
                {analysisLoading ? (
                  <div className="p-6 flex flex-col items-center gap-3">
                    <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-500 animate-spin transition-colors duration-300" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 animate-pulse uppercase tracking-wider transition-colors duration-300">
                      Classification et recommandations...
                    </p>
                    <div className="w-full space-y-2 mt-4">
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-800/60 rounded animate-pulse transition-colors duration-300" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-800/60 rounded animate-pulse w-4/5 transition-colors duration-300" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-800/60 rounded animate-pulse w-3/5 transition-colors duration-300" />
                    </div>
                  </div>
                ) : analysisError ? (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-550/30 rounded-xl text-xs text-rose-700 dark:text-rose-350 flex items-start gap-2.5 transition-colors duration-300">
                    <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-455 shrink-0 mt-0.5 transition-colors duration-300" />
                    <span>{analysisError}</span>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 text-[9px] rounded-full border font-bold transition-colors duration-300 ${
                        analysisResult.classification === 'Urgent' 
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-450'
                      }`}>
                        {analysisResult.classification.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono transition-colors duration-300">
                        Score Confiance : {(analysisResult.score_confiance * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-850 rounded-xl text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300">
                      <p className="font-black text-slate-900 dark:text-slate-200 mb-2 transition-colors duration-300">{analysisResult.resume}</p>
                      <p className="whitespace-pre-line text-slate-600 dark:text-slate-400 transition-colors duration-300">{analysisResult.analyse_detaillee}</p>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 transition-colors duration-300">Actions recommandées</span>
                      <ul className="list-disc pl-4 text-xs text-slate-700 dark:text-slate-350 space-y-1.5 transition-colors duration-300">
                        {analysisResult.actions_recommandees.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-850 pt-3 text-xs transition-colors duration-300">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block transition-colors duration-300">Délai suggéré</span>
                        <span className="text-slate-800 dark:text-slate-300 font-bold transition-colors duration-300">{analysisResult.delai_reponse_suggere}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block transition-colors duration-300">Modèle LLM</span>
                        <span className="text-slate-800 dark:text-slate-300 font-bold font-mono transition-colors duration-300">{analysisResult.moteur}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-850 transition-colors duration-300">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={analysisLoading || !analysisResult}
                onClick={() => {
                  alert('Demande intégrée à la file d\'attente du Secrétariat Général.');
                  closeModal();
                }}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black tracking-wide uppercase active:scale-95 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:scale-100"
              >
                Planifier Instance
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
