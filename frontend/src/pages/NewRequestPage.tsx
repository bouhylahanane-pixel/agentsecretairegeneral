import React, { useState } from 'react';
import { PlusCircle, Loader2, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import { documentRequestsApi } from '../api/documentRequestsApi';
import { useAuth } from '../contexts/AuthContext';

const employeeDocs = [
  { value: 'attestation_travail', label: 'Attestation de travail' },
  { value: 'attestation_presence', label: 'Attestation de présence' },
];

export default function NewRequestPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    document_type: employeeDocs[0].value,
    motif: '',
    details: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await documentRequestsApi.createDocumentRequest(formData);
      setFormData({ document_type: employeeDocs[0].value, motif: '', details: '' });
      setSuccess('Demande transmise avec succès au Secrétariat Général.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Impossible de soumettre la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-sky-600" />
          Nouvelle Demande
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Interface simplifiée pour envoyer instantanément une demande de document au secrétariat.
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

      <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Type de document souhaité</label>
              <select
                value={formData.document_type}
                onChange={(event) => setFormData({ ...formData, document_type: event.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              >
                {employeeDocs.map((doc) => (
                  <option key={doc.value} value={doc.value}>
                    {doc.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Motif principal</label>
              <input
                required
                value={formData.motif}
                onChange={(event) => setFormData({ ...formData, motif: event.target.value })}
                placeholder="Ex: dossier bancaire, inscription, renouvellement carte"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Informations complémentaires</label>
            <textarea
              rows={4}
              value={formData.details}
              onChange={(event) => setFormData({ ...formData, details: event.target.value })}
              placeholder="Précisez toute information utile pour le secrétariat (ex: adressé à Monsieur X, avec mention du salaire net...)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500 resize-none leading-relaxed"
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !formData.motif}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-sky-500/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer la demande
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
