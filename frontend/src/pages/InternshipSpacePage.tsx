import React, { useState } from 'react';
import { GraduationCap, Loader2, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import { documentRequestsApi } from '../api/documentRequestsApi';

export default function InternshipSpacePage() {
  const [formData, setFormData] = useState({
    sujet: '',
    encadrant: '',
    date_debut: '',
    date_fin: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    
    // Send via the existing document requests system but hardcode type to 'attestation_stage'
    try {
      await documentRequestsApi.createDocumentRequest({
        document_type: 'attestation_stage',
        motif: 'Fin de cursus',
        details: `Sujet PFE: ${formData.sujet}\nEncadrant: ${formData.encadrant}\nPériode: du ${formData.date_debut} au ${formData.date_fin}`
      });
      setSuccess('Votre demande d\'attestation de stage a été envoyée au Secrétariat Général.');
      setFormData({ sujet: '', encadrant: '', date_debut: '', date_fin: '' });
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
          <GraduationCap className="w-6 h-6 text-emerald-600" />
          Mon Espace Stage
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Formulaire de fin de cursus pour soumettre votre demande d'Attestation de Stage.
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
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Sujet du Projet de Fin d'Études (PFE)</label>
            <input
              required
              value={formData.sujet}
              onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
              placeholder="Ex: Conception d'une plateforme SaaS RBAC..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Encadrant(e) principal(e)</label>
            <input
              required
              value={formData.encadrant}
              onChange={(e) => setFormData({ ...formData, encadrant: e.target.value })}
              placeholder="Nom de votre responsable de stage"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date de début</label>
              <input
                required
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date de fin</label>
              <input
                required
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !formData.sujet}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-emerald-500/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Demander l'Attestation
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
