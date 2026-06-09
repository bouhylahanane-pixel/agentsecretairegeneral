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
import { useAuth } from '../contexts/AuthContext';
import { documentsApi } from '../api/documentsApi';
import {
  documentRequestsApi,
} from '../api/documentRequestsApi';
import type { DocumentRequest, DocumentRequestStatus } from '../api/documentRequestsApi';

type DocOption = {
  value: string;
  label: string;
};

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

const employeeDocs: DocOption[] = [
  { value: 'attestation_travail', label: 'Attestation de travail' },
  { value: 'attestation_presence', label: 'Attestation de présence' },
];

const stagiaireDocs: DocOption[] = [
  { value: 'attestation_stage', label: 'Attestation de stage' },
  { value: 'attestation_presence', label: 'Attestation de présence' },
];

const staffDocs: DocOption[] = [
  { value: 'attestation_travail', label: 'Attestation de travail' },
  { value: 'attestation_stage', label: 'Attestation de stage' },
  { value: 'attestation_presence', label: 'Attestation de présence' },
  { value: 'convocation_reunion', label: 'Convocation de réunion' },
  { value: 'convocation_entretien', label: 'Convocation entretien' },
];

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

function requesterStatusMessage(request: DocumentRequest) {
  if (request.status === 'ready') {
    return 'Votre document est prêt. Veuillez le récupérer auprès du Secrétariat Général.';
  }
  if (request.status === 'rejected') {
    return request.secretary_comment || 'Votre demande a été refusée par le Secrétariat Général.';
  }
  if (request.status === 'in_progress') {
    return request.secretary_comment || 'Votre demande est en cours de traitement.';
  }
  if (request.status === 'delivered') {
    return 'Document récupéré auprès du Secrétariat Général.';
  }
  return request.secretary_comment || 'Demande reçue, en attente de prise en charge.';
}

export default function DocumentGeneratorPage() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isStaff = role === 'admin' || role === 'secretaire';

  return isStaff ? <StaffDocumentsView /> : <RequesterDocumentsView />;
}

function RequesterDocumentsView() {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const docOptions = role === 'stagiaire' ? stagiaireDocs : employeeDocs;

  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [formData, setFormData] = useState({
    document_type: docOptions[0].value,
    motif: '',
    details: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      setRequests(await documentRequestsApi.getMyDocumentRequests());
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de charger vos demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await documentRequestsApi.createDocumentRequest(formData);
      setFormData({ document_type: docOptions[0].value, motif: '', details: '' });
      setSuccess('Demande transmise au Secrétariat Général.');
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de soumettre la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Mes demandes de documents"
        subtitle="Soumettez une demande et suivez son traitement par le Secrétariat Général."
      />

      <Feedback error={error} success={success} />

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile label="Nom" value={user?.name || user?.nom || 'Utilisateur'} />
        <InfoTile label="Email" value={user?.email || '-'} />
        <InfoTile label="Rôle" value={user?.role || '-'} />
      </section>

      <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mb-4">Nouvelle demande</h3>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Type de document</label>
            <select
              value={formData.document_type}
              onChange={(event) => setFormData({ ...formData, document_type: event.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {docOptions.map((doc) => (
                <option key={doc.value} value={doc.value}>
                  {doc.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Motif</label>
            <input
              value={formData.motif}
              onChange={(event) => setFormData({ ...formData, motif: event.target.value })}
              placeholder="Ex: dossier bancaire, inscription, justificatif"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Détails</label>
            <textarea
              rows={4}
              value={formData.details}
              onChange={(event) => setFormData({ ...formData, details: event.target.value })}
              placeholder="Précisez les informations utiles au traitement de votre demande."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Soumettre la demande
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden">
        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mb-4">Mes demandes</h3>
        {loading ? (
          <LoadingLine label="Chargement des demandes..." />
        ) : requests.length === 0 ? (
          <EmptyLine label="Aucune demande transmise pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Motif</th>
                  <th className="py-3 pr-4">Statut</th>
                  <th className="py-3 pr-4">Suivi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDate(request.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-100">
                      {DOCUMENT_LABELS[request.document_type] || request.document_type}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{request.motif || '-'}</td>
                    <td className="py-3 pr-4"><StatusBadge status={request.status} /></td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {requesterStatusMessage(request)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StaffDocumentsView() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentRequestStatus>('all');
  const [comment, setComment] = useState('');
  const [prepareForm, setPrepareForm] = useState<any>({
    motif: '',
    details: '',
    requester_name: '',
    requester_email: '',
    requester_role: '',
    poste: '',
    departement: '',
    date_recrutement: '',
    entreprise: '',
    service: '',
    encadrant: '',
    date_debut: '',
    date_fin: '',
    date: '',
    heure: '',
    lieu: '',
    objet: '',
    participants: '',
    recruteur: '',
    salle: '',
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [aiWorkingId, setAiWorkingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [directForm, setDirectForm] = useState({
    type: 'attestation_travail',
    nom: '',
    details: '',
    optimiser_ia: false,
  });
  const [directPdf, setDirectPdf] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

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

  const handleDirectGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setDirectPdf(null);
    setDirectLoading(true);
    try {
      const response = await documentsApi.generateDocument(directForm);
      setDirectPdf(response.pdf_path);
      setSuccess(response.message || 'Document généré.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de générer le document.');
    } finally {
      setDirectLoading(false);
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
      <PageHeader
        title="Traitement des demandes de documents"
        subtitle={`${pendingCount} demande(s) en attente de prise en charge.`}
      />

      <Feedback error={error} success={success} />

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
          <LoadingLine label="Chargement des demandes reçues..." />
        ) : filteredRequests.length === 0 ? (
          <EmptyLine label="Aucune demande reçue." />
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
                          <SmallAction onClick={() => selectRequestForPreparation(request)} label="Préparer" />
                          <SmallAction onClick={() => updateStatus(request, 'in_progress')} label="En traitement" icon={<Clock className="w-3.5 h-3.5" />} disabled={busy || request.status === 'in_progress' || request.status === 'rejected' || request.status === 'delivered'} />
                          <SmallAction onClick={() => generateFromRequest(request)} label="Générer PDF" icon={<FileText className="w-3.5 h-3.5" />} disabled={busy || !canGenerate} />
                          <SmallAction onClick={() => updateStatus(request, 'ready')} label="Prêt" icon={<PackageCheck className="w-3.5 h-3.5" />} disabled={busy || !canMarkReady} />
                          <SmallAction onClick={() => updateStatus(request, 'delivered')} label="Récupéré" icon={<UserCheck className="w-3.5 h-3.5" />} disabled={busy || !canMarkDelivered} />
                          <SmallAction onClick={() => selectRequestForPreparation(request)} label="Préparer refus" icon={<XCircle className="w-3.5 h-3.5" />} disabled={busy || request.status === 'delivered'} />
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
            <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
              <label className="block text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 mb-2">
                <Sparkles className="w-3 h-3 inline mr-1 mb-0.5" />
                Auto-remplissage depuis la base
              </label>
              <select
                value={selectedUserEmail}
                onChange={handleUserSelect}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
              >
                <option value="">Sélectionner un employé ou stagiaire...</option>
                {usersList.filter(u => u.user_type === 'employee').length > 0 && (
                  <optgroup label="Employés">
                    {usersList.filter(u => u.user_type === 'employee').map(u => (
                      <option key={u.email} value={u.email}>{u.nom} ({u.departement || u.poste})</option>
                    ))}
                  </optgroup>
                )}
                {usersList.filter(u => u.user_type === 'stagiaire').length > 0 && (
                  <optgroup label="Stagiaires">
                    {usersList.filter(u => u.user_type === 'stagiaire').map(u => (
                      <option key={u.email} value={u.email}>{u.nom}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <InfoTile label="Type demandé" value={DOCUMENT_LABELS[selectedRequest.document_type] || selectedRequest.document_type} />
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Motif officiel</label>
              <input
                value={prepareForm.motif}
                onChange={(event) => setPrepareForm({ ...prepareForm, motif: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du bénéficiaire</label>
              <input
                value={prepareForm.requester_name}
                onChange={(event) => setPrepareForm({ ...prepareForm, requester_name: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email professionnel</label>
              <input
                value={prepareForm.requester_email}
                onChange={(event) => setPrepareForm({ ...prepareForm, requester_email: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Rôle</label>
              <input
                value={prepareForm.requester_role}
                onChange={(event) => setPrepareForm({ ...prepareForm, requester_role: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Poste / Fonction</label>
              <input
                value={prepareForm.poste}
                onChange={(event) => setPrepareForm({ ...prepareForm, poste: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Département</label>
              <input
                value={prepareForm.departement}
                onChange={(event) => setPrepareForm({ ...prepareForm, departement: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date de recrutement</label>
              <input
                value={prepareForm.date_recrutement}
                onChange={(event) => setPrepareForm({ ...prepareForm, date_recrutement: event.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {(selectedRequest.document_type === 'attestation_stage') && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Entreprise d'accueil</label>
                  <input value={prepareForm.entreprise} onChange={(e) => setPrepareForm({ ...prepareForm, entreprise: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Encadrant de Stage</label>
                  <input value={prepareForm.encadrant} onChange={(e) => setPrepareForm({ ...prepareForm, encadrant: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date de début</label>
                  <input type="date" value={prepareForm.date_debut} onChange={(e) => setPrepareForm({ ...prepareForm, date_debut: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date de fin</label>
                  <input type="date" value={prepareForm.date_fin} onChange={(e) => setPrepareForm({ ...prepareForm, date_fin: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}
            
            {selectedRequest.document_type === 'convocation_reunion' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date de la séance</label>
                  <input type="date" value={prepareForm.date} onChange={(e) => setPrepareForm({ ...prepareForm, date: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Heure</label>
                  <input type="time" value={prepareForm.heure} onChange={(e) => setPrepareForm({ ...prepareForm, heure: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Lieu / Salle</label>
                  <input value={prepareForm.lieu} onChange={(e) => setPrepareForm({ ...prepareForm, lieu: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Objet de la rencontre</label>
                  <input value={prepareForm.objet} onChange={(e) => setPrepareForm({ ...prepareForm, objet: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}
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
              <textarea
                rows={5}
                value={prepareForm.details}
                onChange={(event) => setPrepareForm({ ...prepareForm, details: event.target.value })}
                placeholder="Complétez ou corrigez les informations qui doivent apparaître dans le PDF officiel."
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                L'IA propose un texte métier à relire. Le PDF est généré uniquement après validation manuelle.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Commentaire du secrétariat</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Commentaire visible par le demandeur, notamment en cas de refus."
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
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

      <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mb-1">
          Génération directe de document
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Usage exceptionnel réservé au Secrétariat Général et à l'administration.
        </p>
        <form onSubmit={handleDirectGenerate} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Type de document</label>
            <select
              value={directForm.type}
              onChange={(event) => setDirectForm({ ...directForm, type: event.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {staffDocs.map((doc) => (
                <option key={doc.value} value={doc.value}>{doc.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du bénéficiaire</label>
            <input
              required
              value={directForm.nom}
              onChange={(event) => setDirectForm({ ...directForm, nom: event.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Détails ou contexte</label>
            <textarea
              rows={3}
              value={directForm.details}
              onChange={(event) => setDirectForm({ ...directForm, details: event.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={directForm.optimiser_ia}
                onChange={(event) => setDirectForm({ ...directForm, optimiser_ia: event.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Optimiser la rédaction avec l'IA
            </label>
            <div className="flex gap-2">
              {directPdf && (
                <button
                  type="button"
                  onClick={() => downloadFile(directPdf)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </button>
              )}
              <button
                type="submit"
                disabled={directLoading || !directForm.nom}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                {directLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Générer document officiel
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
        <FileText className="w-6 h-6 text-indigo-600" />
        {title}
      </h2>
      <p className="text-xs text-slate-500 font-semibold mt-1">{subtitle}</p>
    </div>
  );
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <>
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
    </>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white break-words">{value}</p>
    </div>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <p className="text-sm text-slate-500">{label}</p>;
}

function SmallAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
