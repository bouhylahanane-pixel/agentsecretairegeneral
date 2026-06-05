import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Send, 
  Download, 
  Mail, 
  Loader2, 
  File as FileIcon,
  Bot
} from 'lucide-react';
import { api } from '../api/endpoints';
import { getDownloadUrl } from '../api/client';
import { useApiError } from '../contexts/ApiErrorContext';

export default function DocumentGeneratorPage() {
  const { setBackendOffline } = useApiError();
  
  // States for manual form
  const [docType, setDocType] = useState('Attestation de Travail');
  const [beneficiary, setBeneficiary] = useState('');
  const [details, setDetails] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);

  // States for IA Assistant
  const [prompt, setPrompt] = useState('');
  const [loadingAssistant, setLoadingAssistant] = useState(false);

  // Output states
  const [generatedPdf, setGeneratedPdf] = useState<string | null>(null);

  const documentTypes = [
    'Attestation de Travail',
    'Attestation de Stage',
    'Attestation de Présence',
    'Convocation de Réunion',
    'Convocation Entretien'
  ];

  const handleManualGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiary) {
      alert("Veuillez saisir le nom du bénéficiaire/destinataire.");
      return;
    }

    setLoadingManual(true);
    setGeneratedPdf(null);
    try {
      const res = await api.generateDocument({
        type: docType,
        nom: beneficiary,
        details: details,
        optimiser_ia: useAI
      });
      setGeneratedPdf(res.data.pdf_path);
      setBackendOffline(false);
    } catch (err: any) {
      console.error(err);
      if (!err.response || err.code === 'ERR_NETWORK') setBackendOffline(true);
      alert("Erreur lors de la génération du document.");
    } finally {
      setLoadingManual(false);
    }
  };

  const handleAIAssistant = async () => {
    if (!prompt.trim()) return;
    
    setLoadingAssistant(true);
    setGeneratedPdf(null);
    try {
      const res = await api.processMessage(prompt, "Admin");
      if (res.data.pdf_path) {
        setGeneratedPdf(res.data.pdf_path);
      } else {
        alert("L'assistant n'a pas pu générer de document. " + (res.data.result || ""));
      }
      setBackendOffline(false);
    } catch (err: any) {
      console.error(err);
      if (!err.response || err.code === 'ERR_NETWORK') setBackendOffline(true);
      alert("Erreur lors de la communication avec l'Assistant IA.");
    } finally {
      setLoadingAssistant(false);
    }
  };

  const setPromptFromSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Colonne de gauche (Formulaires) */}
        <div className="w-full lg:w-7/12 space-y-8">
          
          {/* Formulaire Manuel */}
          <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm dark:shadow-lg p-6 transition-colors duration-300">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Génération Manuelle
            </h2>
            
            <form onSubmit={handleManualGeneration} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  Type de Document
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  {documentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  Bénéficiaire / Destinataire
                </label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="Nom complet"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  Détails & Contenu Principal
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Entrez les informations spécifiques: poste, dates, motif, etc."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="useAI" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Optimiser avec IA (Mise en forme automatique)
                </label>
              </div>

              <button
                type="submit"
                disabled={loadingManual}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loadingManual ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Générer le PDF
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Assistant IA Conversationnel */}
          <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm dark:shadow-lg p-6 transition-colors duration-300">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Assistant IA Conversationnel
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Orchestrez vos tâches administratives en langage naturel
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {[
                "Générer une attestation de travail",
                "Rédiger le PV de réunion",
                "Créer une convocation",
                "Envoyer notification par email"
              ].map((sugg, i) => (
                <button
                  key={i}
                  onClick={() => setPromptFromSuggestion(sugg)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {sugg}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Exemple: Générer une attestation de travail pour Ahmed Benali, poste de Développeur Senior..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              />
              <button
                onClick={handleAIAssistant}
                disabled={loadingAssistant || !prompt.trim()}
                className="absolute bottom-3 right-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingAssistant ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Exécuter
              </button>
            </div>

            <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/10 rounded-xl text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
              <strong className="font-bold">Conseil:</strong> Décrivez votre demande en détail pour des résultats optimaux. L'IA comprend le contexte et peut automatiser plusieurs étapes.
            </div>
          </div>
        </div>

        {/* Colonne de droite (Aperçu) */}
        <div className="w-full lg:w-5/12">
          <div className="sticky top-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-inner min-h-[600px] p-6 flex flex-col items-center justify-center transition-colors duration-300">
            {generatedPdf ? (
              <div className="w-full flex flex-col items-center animate-fade-in">
                <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">Document Prêt</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-8">
                  Le document a été généré avec succès.
                </p>
                <div className="w-full flex flex-col gap-3">
                  <a
                    href={getDownloadUrl(generatedPdf)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                  <button className="w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    Envoyer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                <FileIcon className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Aperçu du Document</h3>
                <p className="text-xs text-center max-w-[200px]">
                  Le PDF généré s'affichera ici
                </p>
                <div className="mt-8 space-y-3 w-48 opacity-20">
                  <div className="h-2 bg-slate-400 rounded-full w-full"></div>
                  <div className="h-2 bg-slate-400 rounded-full w-5/6 mx-auto"></div>
                  <div className="h-2 bg-slate-400 rounded-full w-4/6 mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
