import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Send
} from 'lucide-react';
import { documentsApi } from '../api/documentsApi';

const staffDocs = [
  { value: 'attestation_travail', label: 'Attestation de travail' },
  { value: 'attestation_stage', label: 'Attestation de stage' },
  { value: 'attestation_presence', label: 'Attestation de présence' },
  { value: 'convocation_reunion', label: 'Convocation de réunion' },
  { value: 'convocation_entretien', label: 'Convocation entretien' },
];

export default function DocumentTemplatesPage() {
  const [directForm, setDirectForm] = useState({
    type: 'attestation_travail',
    nom: '',
    email: '',
    details: '',
    optimiser_ia: false,
    poste: '',
    departement: '',
    date_debut: '',
    date_fin: '',
    entreprise: '',
    service: '',
    encadrant: '',
    requester_role: '',
    date: '',
    heure: '',
    lieu: '',
    objet: '',
    participants: '',
    recruteur: '',
    salle: '',
  });
  const [directPdf, setDirectPdf] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  useEffect(() => {
    documentsApi.getDocumentUsers().then(data => {
      setUsersList(data);
    }).catch(err => console.error("Error fetching users:", err));
  }, []);

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const email = e.target.value;
    setSelectedUserEmail(email);
    
    if (!email) return;

    const user = usersList.find(u => u.email === email);
    if (user) {
      setDirectForm(prev => ({
        ...prev,
        nom: user.nom || '',
        email: user.email || '',
        poste: user.poste || '',
        departement: user.departement || '',
        date_recrutement: user.date_recrutement || '',
        entreprise: 'Smart Automation Technologies', // Par défaut
        date_debut: user.date_debut || '',
        date_fin: user.date_fin || '',
        encadrant: '',
        service: '',
        requester_role: user.poste || user.user_type || '',
      }));
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
      setSuccess(response.message || 'Document généré avec succès.');
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

  const sendByEmail = async () => {
    if (!directPdf) return;
    if (!directForm.email) {
      setError("Veuillez saisir une adresse email dans le formulaire avant d'envoyer.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await documentsApi.sendDocumentByEmail({
        email: directForm.email,
        nom: directForm.nom,
        type: directForm.type,
        pdf_path: directPdf
      });
      setSuccess(`Le document a été envoyé par email à ${directForm.email}.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi de l'email.");
    }
  };

  // Document preview simulation content
  const previewTitle = staffDocs.find(d => d.value === directForm.type)?.label.toUpperCase() || 'DOCUMENT';
  const currentDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 shrink-0">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          Modèles de Documents & Génération
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Génération directe d'attestations et de convocations avec prévisualisation.
        </p>
      </div>

      {(error || success) && (
        <div className="mb-6 shrink-0">
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
        </div>
      )}

      {/* Split Screen Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Side: Form */}
        <section className="lg:w-1/2 flex flex-col bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-y-auto">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
              Saisie des informations
            </h3>
          </div>
          <form onSubmit={handleDirectGenerate} className="p-5 grid gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Gabarit de document</label>
              <select
                value={directForm.type}
                onChange={(event) => setDirectForm({ ...directForm, type: event.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {staffDocs.map((doc) => (
                  <option key={doc.value} value={doc.value}>{doc.label}</option>
                ))}
              </select>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
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

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Bénéficiaire ou Candidat</label>
              <input
                required
                placeholder="Prénom et Nom"
                value={directForm.nom}
                onChange={(event) => setDirectForm({ ...directForm, nom: event.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Email du destinataire (Optionnel pour générer, Requis pour envoyer)</label>
              <input
                type="email"
                placeholder="email@exemple.com"
                value={directForm.email}
                onChange={(event) => setDirectForm({ ...directForm, email: event.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {directForm.type === 'attestation_travail' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Poste occupé</label>
                    <input value={directForm.poste} onChange={(e) => setDirectForm({ ...directForm, poste: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Département</label>
                    <input value={directForm.departement} onChange={(e) => setDirectForm({ ...directForm, departement: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date de prise de fonction</label>
                  <input type="date" value={directForm.date_debut} onChange={(e) => setDirectForm({ ...directForm, date_debut: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}

            {directForm.type === 'attestation_stage' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Entreprise d'accueil</label>
                    <input value={directForm.entreprise} onChange={(e) => setDirectForm({ ...directForm, entreprise: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Département / Service</label>
                    <input value={directForm.service} onChange={(e) => setDirectForm({ ...directForm, service: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Encadrant de Stage</label>
                  <input value={directForm.encadrant} onChange={(e) => setDirectForm({ ...directForm, encadrant: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date de début</label>
                    <input type="date" value={directForm.date_debut} onChange={(e) => setDirectForm({ ...directForm, date_debut: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date de fin</label>
                    <input type="date" value={directForm.date_fin} onChange={(e) => setDirectForm({ ...directForm, date_fin: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </>
            )}

            {directForm.type === 'attestation_presence' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Qualité / Rôle</label>
                    <input value={directForm.requester_role} onChange={(e) => setDirectForm({ ...directForm, requester_role: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Département</label>
                    <input value={directForm.departement} onChange={(e) => setDirectForm({ ...directForm, departement: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </>
            )}

            {directForm.type === 'convocation_reunion' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date de la séance</label>
                    <input type="date" value={directForm.date} onChange={(e) => setDirectForm({ ...directForm, date: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Heure</label>
                    <input type="time" value={directForm.heure} onChange={(e) => setDirectForm({ ...directForm, heure: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Lieu / Salle</label>
                    <input value={directForm.lieu} onChange={(e) => setDirectForm({ ...directForm, lieu: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Objet de la rencontre</label>
                    <input value={directForm.objet} onChange={(e) => setDirectForm({ ...directForm, objet: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Liste des Participants</label>
                  <input value={directForm.participants} onChange={(e) => setDirectForm({ ...directForm, participants: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}

            {directForm.type === 'convocation_entretien' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Poste visé</label>
                    <input value={directForm.poste} onChange={(e) => setDirectForm({ ...directForm, poste: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Responsable recrutement</label>
                    <input value={directForm.recruteur} onChange={(e) => setDirectForm({ ...directForm, recruteur: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Date fixée</label>
                    <input type="date" value={directForm.date} onChange={(e) => setDirectForm({ ...directForm, date: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Heure de rendez-vous</label>
                    <input type="time" value={directForm.heure} onChange={(e) => setDirectForm({ ...directForm, heure: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Lieu de l'entretien</label>
                    <input value={directForm.lieu} onChange={(e) => setDirectForm({ ...directForm, lieu: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Salle</label>
                    <input value={directForm.salle} onChange={(e) => setDirectForm({ ...directForm, salle: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Contexte, Observations, ou Détails Additionnels (Optionnel)</label>
              <textarea
                rows={3}
                placeholder="Ex: Entretien pour le poste de Développeur Fullstack le 12 Juin à 14h. Jury: M. Dupont."
                value={directForm.details}
                onChange={(event) => setDirectForm({ ...directForm, details: event.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>
            
            <label className="flex items-center gap-3 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors">
              <input
                type="checkbox"
                checked={directForm.optimiser_ia}
                onChange={(event) => setDirectForm({ ...directForm, optimiser_ia: event.target.checked })}
                className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Optimiser la rédaction avec l'IA LLaMA
              </span>
            </label>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={directLoading || !directForm.nom}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-transform active:scale-95 shadow-md shadow-indigo-500/20"
              >
                {directLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Générer le Document Officiel
              </button>
            </div>
          </form>
        </section>

        {/* Right Side: A4 Preview Panel */}
        <section className="lg:w-1/2 flex flex-col bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* A4 Toolbar */}
          <div className="h-14 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prévisualisation A4</span>
            <div className="flex gap-2">
               <button
                  type="button"
                  disabled={!directPdf}
                  onClick={sendByEmail}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 rounded-lg text-[11px] font-bold disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Envoyer par Email
                </button>
                <button
                  type="button"
                  disabled={!directPdf}
                  onClick={() => downloadFile(directPdf)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 rounded-lg text-[11px] font-bold disabled:opacity-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger PDF
                </button>
            </div>
          </div>
          
          {/* A4 Paper Canvas */}
          <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center bg-slate-200/50 dark:bg-slate-950 shadow-inner">
            <div className="bg-white w-full max-w-[21cm] min-h-[29.7cm] shadow-xl p-12 text-slate-800 relative ring-1 ring-slate-900/5">
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-6 mb-12">
                <div>
                  <h1 className="text-xl font-black text-indigo-900 tracking-tighter">SMART AUTOMATION</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Technologies & IA</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 leading-relaxed font-medium">
                  <p>123 Avenue de l'Innovation</p>
                  <p>Casablanca, 20000</p>
                  <p>contact@smartautomation.tech</p>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-center text-2xl font-serif font-bold underline decoration-indigo-200 underline-offset-8 mb-16">
                {previewTitle}
              </h2>

              {/* Content Body */}
              <div className="space-y-6 text-sm leading-loose font-serif text-justify min-h-[300px]">
                {directForm.type === 'convocation_reunion' ? (
                  <p>Le <strong>Secrétariat Général de Smart Automation Technologies</strong> vous convie à une réunion de travail :</p>
                ) : directForm.type === 'convocation_entretien' ? (
                  <p>Le <strong>Secrétariat Général de Smart Automation Technologies</strong> vous convoque pour un entretien :</p>
                ) : (
                  <p>Nous, soussignés, <strong>Secrétariat Général de Smart Automation Technologies</strong>, certifions par la présente que :</p>
                )}
                
                <p className="text-center text-lg font-bold font-sans text-indigo-900 my-8 py-4 bg-slate-50 rounded border border-slate-100">
                  {directForm.nom ? directForm.nom.toUpperCase() : (directForm.type.startsWith('convocation') ? '[ NOM DU DESTINATAIRE ]' : '[ NOM DU BÉNÉFICIAIRE ]')}
                </p>

                {directForm.details ? (
                  <p className="whitespace-pre-wrap">{directForm.details}</p>
                ) : (
                  <div className="bg-slate-50 p-6 border border-slate-100 rounded text-slate-700 space-y-4">
                    {directForm.type === 'attestation_travail' && (
                      <>
                        <p><strong>Poste occupé :</strong> {directForm.poste || '[ Poste du collaborateur ]'}</p>
                        <p><strong>Département :</strong> {directForm.departement || '[ Département ]'}</p>
                        <p><strong>Date de prise de fonction :</strong> {directForm.date_debut || '[ Date ]'}</p>
                      </>
                    )}
                    {directForm.type === 'attestation_stage' && (
                      <>
                        <p><strong>Entreprise d'accueil :</strong> {directForm.entreprise || 'Smart Automation Technologies'}</p>
                        <p><strong>Département / Service :</strong> {directForm.service || '[ Service ]'}</p>
                        <p><strong>Encadrant de Stage :</strong> {directForm.encadrant || '[ Nom de l\'encadrant ]'}</p>
                        <p><strong>Période de stage :</strong> {directForm.date_debut || '[ Date de début ]'} au {directForm.date_fin || '[ Date de fin ]'}</p>
                      </>
                    )}
                    {directForm.type === 'attestation_presence' && (
                      <>
                        <p><strong>Qualité :</strong> {directForm.requester_role || '[ Rôle / Fonction ]'}</p>
                        <p><strong>Département :</strong> {directForm.departement || '[ Département ]'}</p>
                        <p><strong>Adresse e-mail :</strong> {directForm.email || '[ Email professionnel ]'}</p>
                      </>
                    )}
                    {directForm.type === 'convocation_reunion' && (
                      <>
                        <p><strong>Date de la séance :</strong> {directForm.date || '[ Date ]'}</p>
                        <p><strong>Heure :</strong> {directForm.heure || '[ Heure ]'}</p>
                        <p><strong>Lieu / Salle :</strong> {directForm.lieu || '[ Salle de réunion ]'}</p>
                        <p><strong>Objet de la rencontre :</strong> {directForm.objet || '[ Objet ]'}</p>
                        <p><strong>Liste des Participants :</strong> {directForm.participants || '[ Participants ]'}</p>
                      </>
                    )}
                    {directForm.type === 'convocation_entretien' && (
                      <>
                        <p><strong>Poste visé :</strong> {directForm.poste || '[ Intitulé du poste ]'}</p>
                        <p><strong>Responsable du recrutement :</strong> {directForm.recruteur || '[ Nom du recruteur ]'}</p>
                        <p><strong>Date fixée :</strong> {directForm.date || '[ Date ]'}</p>
                        <p><strong>Heure de rendez-vous :</strong> {directForm.heure || '[ Heure ]'}</p>
                        <p><strong>Lieu de l'entretien :</strong> {directForm.lieu || '[ Bureau / Salle ]'} {directForm.salle ? `- ${directForm.salle}` : ''}</p>
                      </>
                    )}
                  </div>
                )}

                {directForm.type.startsWith('convocation') ? (
                  <p className="mt-12">Nous vous prions de bien vouloir prendre vos dispositions pour être présent(e).</p>
                ) : (
                  <p className="mt-12">En foi de quoi, ce document est délivré pour servir et valoir ce que de droit.</p>
                )}
              </div>

              {/* Footer Signatures */}
              <div className="mt-24 pt-8 flex justify-between items-end">
                <div className="text-[10px] text-slate-400">
                  <p>Réf: SAT-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(4, '0')}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs mb-8">Fait à Casablanca, le {currentDate}</p>
                  <p className="font-bold text-sm text-indigo-900 border-t border-slate-200 pt-2 inline-block px-8">
                    Le Secrétariat Général
                  </p>
                </div>
              </div>

              {/* Overlay when loading */}
              {directLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 text-indigo-600">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p className="font-bold text-sm uppercase tracking-widest">Génération en cours...</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
