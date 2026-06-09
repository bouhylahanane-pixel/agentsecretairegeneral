import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Mail, Loader2, AlertTriangle, CheckCircle, Clock, Users, FileText } from 'lucide-react';
import { meetingsApi } from '../api/meetingsApi';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titre: '',
    date: '',
    heure: '',
    participants: '',
    objet: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<number | null>(null);

  const loadMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getMeetings();
      setMeetings(data);
    } catch (err: any) {
      setError("Erreur lors du chargement des réunions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await meetingsApi.createMeeting(formData);
      showSuccess("Réunion planifiée avec succès.");
      setFormData({ titre: '', date: '', heure: '', participants: '', objet: '' });
      loadMeetings();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la création.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment annuler cette réunion ?")) return;
    try {
      await meetingsApi.deleteMeeting(id);
      showSuccess("Réunion supprimée.");
      loadMeetings();
    } catch (err: any) {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleInvite = async (m: any) => {
    if (!window.confirm(`Envoyer les invitations par e-mail pour la réunion "${m.titre}" ?`)) return;
    setInvitingId(m.id);
    try {
      const res = await meetingsApi.triggerInvitations({ 
        id: m.id, 
        titre: m.titre, 
        date: m.date, 
        heure: m.heure,
        objet: m.objet,
        participants: m.participants 
      });
      showSuccess(res.message || "Invitations envoyées avec succès.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Échec de l'envoi des invitations.");
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Gestion des Réunions
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Planifiez vos instances et convoquez les participants (Module SMTP).
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulaire de création */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm h-fit">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500"/> Planifier une réunion
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Titre de la réunion</label>
              <input required value={formData.titre} onChange={e=>setFormData({...formData, titre: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Réunion de Direction" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date</label>
                <input required type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Heure</label>
                <input required type="time" value={formData.heure} onChange={e=>setFormData({...formData, heure: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Participants (séparés par virgule)</label>
              <input required value={formData.participants} onChange={e=>setFormData({...formData, participants: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Hanane, Yassine, Ahmed" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Objet / Ordre du jour</label>
              <textarea required rows={3} value={formData.objet} onChange={e=>setFormData({...formData, objet: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Validation du budget..." />
            </div>
            <button disabled={formLoading} type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
              {formLoading && <Loader2 className="w-3 h-3 animate-spin"/>} Planifier
            </button>
          </form>
        </div>

        {/* Liste des réunions */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
          ) : meetings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm italic">
              Aucune réunion planifiée pour le moment.
            </div>
          ) : (
            meetings.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.titre}</h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"><Calendar className="w-3 h-3"/> {m.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {m.heure}</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 flex flex-col gap-1">
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> <strong>Participants:</strong> {m.participants}</span>
                      <span className="flex items-start gap-1.5"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0"/> <span className="line-clamp-2"><strong>Objet:</strong> {m.objet}</span></span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 justify-end sm:min-w-[150px]">
                    <button 
                      onClick={() => handleInvite(m)}
                      disabled={invitingId === m.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800/50 disabled:opacity-50"
                    >
                      {invitingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5" />}
                      Inviter
                    </button>
                    <button 
                      onClick={() => handleDelete(m.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold transition-colors border border-rose-200 dark:border-rose-800/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}