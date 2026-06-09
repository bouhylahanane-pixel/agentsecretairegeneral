import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock, MapPin, Users, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { documentRequestsApi } from '../api/documentRequestsApi';
import type { DocumentRequest } from '../api/documentRequestsApi';
import { documentsApi } from '../api/documentsApi';

const DOCUMENT_LABELS: Record<string, string> = {
  convocation_reunion: 'Convocation de réunion',
  convocation_entretien: 'Convocation entretien',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EmployeeCalendarPage() {
  const [meetings, setMeetings] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const reqs = await documentRequestsApi.getMyDocumentRequests();
        const convs = reqs.filter(r => r.document_type === 'convocation_reunion' || r.document_type === 'convocation_entretien');
        setMeetings(convs);
      } catch (err: any) {
        setError("Impossible de charger vos convocations.");
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  const downloadFile = async (filePath?: string | null) => {
    if (!filePath) return;
    try {
      await documentsApi.downloadDocument(filePath);
    } catch {
      setError('Erreur lors du téléchargement de la convocation.');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-sky-600" />
          Mon Calendrier
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Liste de vos invitations aux comités et réunions.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Chargement...</div>
      ) : meetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-sm">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Aucune réunion prévue</h3>
          <p className="text-xs text-slate-500">Vous n'avez aucune convocation dans votre calendrier.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => {
            const isReady = meeting.status === 'ready' || meeting.status === 'delivered' || Boolean(meeting.generated_file_path);
            
            return (
              <div key={meeting.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{DOCUMENT_LABELS[meeting.document_type] || meeting.document_type}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {meeting.status}
                    </span>
                    {isReady && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Confirmée
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{formatDate(meeting.created_at)}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{meeting.motif || "Secrétariat"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => downloadFile(meeting.generated_file_path)}
                    disabled={!isReady || !meeting.generated_file_path}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Ma Convocation
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
