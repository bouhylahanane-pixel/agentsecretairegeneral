import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  PackageCheck,
  Search,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { documentRequestsApi } from '../api/documentRequestsApi';
import type { DocumentRequest, DocumentRequestStatus } from '../api/documentRequestsApi';
import { documentsApi } from '../api/documentsApi';

const DOCUMENT_LABELS: Record<string, string> = {
  attestation_travail: 'Attestation de travail',
  attestation_stage: 'Attestation de stage',
  attestation_presence: 'Attestation de présence',
  convocation_reunion: 'Convocation de réunion',
  convocation_entretien: 'Convocation entretien',
};

const STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  pending: 'En attente',
  in_progress: 'En traitement',
  ready: 'Prêt à récupérer',
  delivered: 'Récupéré',
  rejected: 'Refusé',
};

const STATUS_STYLES: Record<DocumentRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-sky-50 text-sky-700 border-sky-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  delivered: 'bg-slate-100 text-slate-700 border-slate-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: DocumentRequestStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentRequestStatus>('all');
  const [comment, setComment] = useState('');
  const [prepareForm, setPrepareForm] = useState({
    requester_name: '',
    requester_email: '',
    requester_role: '',
    poste: '',
    departement: '',
    date_recrutement: '',
    motif: '',
    details: '',
  });
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [aiWorkingId, setAiWorkingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending').length, [requests]);
  const filteredRequests = useMemo(
    () => statusFilter === 'all' ? requests : requests.filter((request) => request.status === statusFilter),
    [requests, statusFilter],
  );

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await documentRequestsApi.getAllDocumentRequests();
      setRequests(data);
      if (selectedRequest) {
        setSelectedRequest(data.find((request) => request.id === selectedRequest.id) || null);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const buildPreparationForm = (request: DocumentRequest) => ({
    requester_name: request.requester_name || '',
    requester_email: request.requester_email || '',
    requester_role: request.requester_role || '',
    poste: request.requester_poste || '',
    departement: request.requester_departement || '',
    date_recrutement: request.requester_date_recrutement || '',
    motif: request.motif || '',
    details: request.details || '',
  });

  const selectRequestForPreparation = (request: DocumentRequest) => {
    setSelectedRequest(request);
    setComment(request.secretary_comment || '');
    setPrepareForm(buildPreparationForm(request));
  };

  const updateStatus = async (request: DocumentRequest, status: DocumentRequestStatus, secretary_comment?: string) => {
    setError(null);
    setSuccess(null);
    setWorkingId(request.id);
    try {
      const updated = await documentRequestsApi.updateDocumentRequestStatus(request.id, {
        status,
        secretary_comment,
      });
      setSuccess(`Demande #${request.id} mise à jour.`);
      setSelectedRequest(updated);
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de mettre à jour la demande.');
    } finally {
      setWorkingId(null);
    }
  };

  const prepareWithAi = async () => {
    if (!selectedRequest) return;
    setError(null);
    setSuccess(null);
    setAiWorkingId(selectedRequest.id);
    try {
      const response = await documentRequestsApi.prepareDocumentRequestWithAi(selectedRequest.id, {
        requester_name: prepareForm.requester_name,
        requester_email: prepareForm.requester_email,
        requester_role: prepareForm.requester_role,
        poste: prepareForm.poste,
        departement: prepareForm.departement,
        date_recrutement: prepareForm.date_recrutement,
        motif: prepareForm.motif,
        details: prepareForm.details,
      });
      setPrepareForm((current) => ({ ...current, details: response.details }));
      setSuccess(`Texte officiel préparé avec ${response.moteur}. Relisez puis générez le PDF.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Impossible de préparer le texte avec l'IA.");
    } finally {
      setAiWorkingId(null);
    }
  };

  const generateFromRequest = async (request: DocumentRequest) => {
    setError(null);
    setSuccess(null);
    setWorkingId(request.id);
    try {
      const source = selectedRequest?.id === request.id ? prepareForm : buildPreparationForm(request);
      const updated = await documentRequestsApi.generateDocumentFromRequest(request.id, {
        requester_name_override: source.requester_name,
        requester_email_override: source.requester_email,
        requester_role_override: source.requester_role,
        poste_override: source.poste,
        departement_override: source.departement,
        date_recrutement_override: source.date_recrutement,
        motif_override: source.motif,
        details_override: source.details,
        optimiser_ia: false,
      });
      setSuccess(`PDF officiel généré pour la demande #${request.id}.`);
      setSelectedRequest(updated);
      setPrepareForm(buildPreparationForm(updated));
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de générer le PDF.');
    } finally {
      setWorkingId(null);
    }
  };

  const downloadFile = async (filePath?: string | null) => {
    if (!filePath) return;
    try {
      await documentsApi.downloadDocument(filePath);
    } catch {
      setError('Erreur lors du téléchargement.');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          Demandes en Attente
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          {pendingCount} demande(s) en attente de prise en charge.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Demandes reçues</h3>
            <p className="text-xs text-slate-500 mt-1">{filteredRequests.length} demande(s) affichée(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | DocumentRequestStatus)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En traitement</option>
              <option value="ready">Prêt à récupérer</option>
              <option value="delivered">Récupéré</option>
              <option value="rejected">Refusé</option>
            </select>
            <button
              type="button"
              onClick={loadRequests}
              className="inline-flex h-10 items-center gap-2 px-3 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Search className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />Chargement...</div>
        ) : filteredRequests.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune demande reçue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Demandeur</th>
                  <th className="py-3 pr-4">Rôle</th>
                  <th className="py-3 pr-4">Type document</th>
                  <th className="py-3 pr-4">Motif</th>
                  <th className="py-3 pr-4">Statut</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRequests.map((request) => {
                  const busy = workingId === request.id;
                  const canGenerate = request.status !== 'rejected' && request.status !== 'delivered';
                  const canMarkReady = Boolean(request.generated_file_path) && request.status !== 'rejected' && request.status !== 'delivered';
                  const canMarkDelivered = request.status === 'ready';
                  return (
                    <tr key={request.id} className="align-top">
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDate(request.created_at)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-100">
                        {request.requester_name || request.requester_email}
                      </td>
                      <td className="py-3 pr-4 capitalize text-slate-600 dark:text-slate-300">{request.requester_role}</td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                        {DOCUMENT_LABELS[request.document_type] || request.document_type}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{request.motif || '-'}</td>
                      <td className="py-3 pr-4"><StatusBadge status={request.status} /></td>
                      <td className="py-3 pr-4">
                        <div className="grid min-w-[360px] grid-cols-2 gap-2 xl:grid-cols-3">
                          <button disabled={busy} onClick={() => selectRequestForPreparation(request)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">Préparer</button>
                          <button disabled={busy || request.status === 'in_progress' || request.status === 'rejected' || request.status === 'delivered'} onClick={() => updateStatus(request, 'in_progress')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><Clock className="w-3.5 h-3.5"/>En traitement</button>
                          <button disabled={busy || !canGenerate} onClick={() => generateFromRequest(request)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><FileText className="w-3.5 h-3.5"/>Générer PDF</button>
                          <button disabled={busy || !canMarkReady} onClick={() => updateStatus(request, 'ready')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><PackageCheck className="w-3.5 h-3.5"/>Prêt</button>
                          <button disabled={busy || !canMarkDelivered} onClick={() => updateStatus(request, 'delivered')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><UserCheck className="w-3.5 h-3.5"/>Récupéré</button>
                          <button disabled={busy || request.status === 'delivered'} onClick={() => selectRequestForPreparation(request)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><XCircle className="w-3.5 h-3.5"/>Préparer refus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRequest && (
        <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                Préparer le document #{selectedRequest.id}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{selectedRequest.requester_email}</p>
            </div>
            <StatusBadge status={selectedRequest.status} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Type demandé</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white break-words">{DOCUMENT_LABELS[selectedRequest.document_type] || selectedRequest.document_type}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Motif officiel</label>
              <input value={prepareForm.motif} onChange={(e) => setPrepareForm({ ...prepareForm, motif: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du bénéficiaire</label>
              <input value={prepareForm.requester_name} onChange={(e) => setPrepareForm({ ...prepareForm, requester_name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email professionnel</label>
              <input value={prepareForm.requester_email} onChange={(e) => setPrepareForm({ ...prepareForm, requester_email: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Rôle</label>
              <input value={prepareForm.requester_role} onChange={(e) => setPrepareForm({ ...prepareForm, requester_role: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Poste / Fonction</label>
              <input value={prepareForm.poste} onChange={(e) => setPrepareForm({ ...prepareForm, poste: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Département</label>
              <input value={prepareForm.departement} onChange={(e) => setPrepareForm({ ...prepareForm, departement: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date de recrutement</label>
              <input value={prepareForm.date_recrutement} onChange={(e) => setPrepareForm({ ...prepareForm, date_recrutement: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="md:col-span-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500">Informations à intégrer dans le document</label>
                <button
                  type="button"
                  onClick={prepareWithAi}
                  disabled={aiWorkingId === selectedRequest.id || selectedRequest.status === 'rejected' || selectedRequest.status === 'delivered'}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                >
                  {aiWorkingId === selectedRequest.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Préparer avec IA
                </button>
              </div>
              <textarea rows={5} value={prepareForm.details} onChange={(e) => setPrepareForm({ ...prepareForm, details: e.target.value })} placeholder="Complétez ou corrigez les informations qui doivent apparaître dans le PDF officiel." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                L'IA propose un texte métier à relire. Le PDF est généré uniquement après validation manuelle.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Commentaire du secrétariat</label>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire visible par le demandeur, notamment en cas de refus." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => generateFromRequest(selectedRequest)}
              disabled={workingId === selectedRequest.id || selectedRequest.status === 'rejected' || selectedRequest.status === 'delivered'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {workingId === selectedRequest.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Générer PDF avec ces informations
            </button>
            {selectedRequest.generated_file_path && selectedRequest.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => downloadFile(selectedRequest.generated_file_path)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                <Download className="w-4 h-4" />
                Télécharger PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => updateStatus(selectedRequest, 'rejected', comment)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold"
            >
              <XCircle className="w-4 h-4" />
              Refuser avec commentaire
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
