import React, { useEffect, useState } from 'react';
import { FolderOpen, Download, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { documentRequestsApi } from '../api/documentRequestsApi';
import type { DocumentRequest } from '../api/documentRequestsApi';
import { documentsApi } from '../api/documentsApi';

const DOCUMENT_LABELS: Record<string, string> = {
  attestation_travail: 'Attestation de travail',
  attestation_stage: 'Attestation de stage',
  attestation_presence: 'Attestation de présence',
  convocation_reunion: 'Convocation de réunion',
  convocation_entretien: 'Convocation entretien',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function EmployeeDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const reqs = await documentRequestsApi.getMyDocumentRequests();
        // Only show completed/ready documents
        const readyDocs = reqs.filter(r => r.status === 'ready' || r.status === 'delivered' || Boolean(r.generated_file_path));
        setDocuments(readyDocs);
      } catch (err: any) {
        setError("Impossible de charger vos documents.");
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const downloadFile = async (filePath?: string | null) => {
    if (!filePath) return;
    try {
      await documentsApi.downloadDocument(filePath);
    } catch {
      setError('Erreur lors du téléchargement.');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-sky-600" />
          Mes Documents
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Vos attestations officielles validées et documents de réunions.
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
      ) : documents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-sm">
          <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Dossier vide</h3>
          <p className="text-xs text-slate-500">Aucun document officiel n'est disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{formatDate(doc.created_at)}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {DOCUMENT_LABELS[doc.document_type] || doc.document_type}
              </h3>
              <p className="text-xs text-slate-500 mb-6 flex-1">{doc.motif || "Demande validée par le secrétariat"}</p>
              
              <button 
                onClick={() => downloadFile(doc.generated_file_path)}
                disabled={!doc.generated_file_path}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
