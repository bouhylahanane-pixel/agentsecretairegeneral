import { useState } from 'react';
import {
  Upload,
  Mic,
  Square,
  Loader2,
  FileCheck,
  FileDown,
  BrainCircuit,
  Sparkles,
  FileText,
  ListChecks,
} from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { api } from '../../api/endpoints';
import { getDownloadUrl } from '../../api/client';
import type { PVResult, TasksExtractionResult } from '../../types';

export default function PVUploader() {
  const [ordreDuJour, setOrdreDuJour] = useState('');
  const [participantsStr, setParticipantsStr] = useState('Meryem, Sanaa, Ahmed');
  const [rawText, setRawText] = useState('');
  const [structuredPV, setStructuredPV] = useState<PVResult | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<TasksExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const participantsList = participantsStr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const handleMicrophoneComplete = async (audioBlob: Blob) => {
    setLoading(true);
    setStatusText('Transcription vocale via Whisper...');
    try {
      const res = await api.transcribeAudio(audioBlob);
      if (res.data?.text) {
        setRawText((prev) => (prev ? `${prev}\n\n${res.data.text}` : res.data.text));
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la transcription audio.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const { isRecording, startRecording, stopRecording } =
    useAudioRecorder(handleMicrophoneComplete);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLoading(true);
      setStatusText('Extraction textuelle Whisper...');
      try {
        const res = await api.uploadPVFile(e.target.files[0]);
        if (res.data?.transcription) {
          setRawText((prev) =>
            prev ? `${prev}\n\n${res.data.transcription}` : res.data.transcription
          );
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'extraction audio.");
      } finally {
        setLoading(false);
        setStatusText('');
      }
    }
  };

  /** POST /api/generate-minutes — PV Markdown + HTML + PDF */
  const handleGenerateMinutes = async () => {
    if (!rawText.trim()) {
      alert('Collez ou transcrivez des notes brutes.');
      return;
    }
    if (!ordreDuJour.trim()) {
      alert("Renseignez l'ordre du jour.");
      return;
    }
    setLoading(true);
    setStatusText('Génération du procès-verbal via LLaMA 3.3...');
    setStructuredPV(null);
    setExtractedTasks(null);
    try {
      const res = await api.generateMinutes({
        ordre_du_jour: ordreDuJour,
        participants: participantsList,
        notes_brutes: rawText,
      });
      setStructuredPV(res.data);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du PV.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  /** POST /api/tasks/extract — plan d'actions */
  const handleExtractTasks = async () => {
    const texte = structuredPV?.pv_markdown || rawText;
    if (!texte.trim()) {
      alert('Générez d\'abord un PV ou saisissez des notes.');
      return;
    }
    setLoading(true);
    setStatusText('Extraction des tâches (Qui / Quoi / Quand)...');
    try {
      const res = await api.extractTasks(texte);
      setExtractedTasks(res.data);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'extraction des tâches.");
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const downloadMarkdown = () => {
    if (!structuredPV?.pv_markdown) return;
    const blob = new Blob([structuredPV.pv_markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = structuredPV.nom_fichier_md || `PV_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Ordre du jour</label>
          <input
            type="text"
            value={ordreDuJour}
            onChange={(e) => setOrdreDuJour(e.target.value)}
            placeholder="ex: Conseil d'Administration — Budget S2"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Participants</label>
          <input
            type="text"
            value={participantsStr}
            onChange={(e) => setParticipantsStr(e.target.value)}
            placeholder="Meryem, Sanaa, Ahmed"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Outils d&apos;acquisition :</span>
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-[11px] font-bold rounded-xl"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              Arrêter micro
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-bold rounded-xl disabled:opacity-50"
            >
              <Mic className="w-3.5 h-3.5" />
              Dictée Micro
            </button>
          )}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-xl cursor-pointer">
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" disabled={loading} />
            <Upload className="w-3.5 h-3.5" />
            Importer Audio
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            Notes brutes de réunion
          </h3>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Collez vos notes ici ou utilisez la dictée / import audio..."
            className="w-full min-h-[320px] p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-xs leading-relaxed resize-none"
          />
          <button
            type="button"
            disabled={loading || !rawText.trim()}
            onClick={handleGenerateMinutes}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {loading && statusText.includes('procès-verbal') ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                Générer le PV (API)
              </>
            )}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Document généré
            </h3>
            <div className="flex gap-2">
              {structuredPV?.pv_markdown && (
                <button
                  type="button"
                  onClick={downloadMarkdown}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-xl border"
                >
                  <FileDown className="w-3 h-3" />
                  .md
                </button>
              )}
              {structuredPV?.pdf_path && (
                <a
                  href={getDownloadUrl(structuredPV.pdf_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-xl"
                >
                  <FileDown className="w-3 h-3" />
                  PDF
                </a>
              )}
            </div>
          </div>

          <div className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl p-4 min-h-[280px] max-h-[380px] overflow-y-auto">
            {loading && statusText.includes('procès-verbal') ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-[11px] font-bold text-slate-500 animate-pulse">{statusText}</span>
                <div className="w-full max-w-xs space-y-2 mt-4">
                  <div className="h-2.5 bg-slate-200 rounded animate-pulse" />
                  <div className="h-2.5 bg-slate-200 rounded animate-pulse w-5/6" />
                  <div className="h-2.5 bg-slate-200 rounded animate-pulse w-4/6" />
                </div>
              </div>
            ) : structuredPV ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-emerald-800 font-bold">
                  <FileCheck className="w-4 h-4" />
                  PV généré ({structuredPV.moteur})
                </div>
                <div className="bg-white p-4 rounded-xl border whitespace-pre-wrap font-medium text-slate-800">
                  {structuredPV.pv_markdown}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center py-12">
                Le PV apparaîtra ici après génération.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={loading || (!structuredPV && !rawText.trim())}
            onClick={handleExtractTasks}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            <ListChecks className="w-4 h-4" />
            Extraire le plan d&apos;actions
          </button>
        </div>
      </div>

      {extractedTasks && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-500" />
            Plan d&apos;actions — {extractedTasks.nombre_taches} tâche(s) ({extractedTasks.moteur})
          </h4>
          <p className="text-[11px] text-slate-500 mb-4">{extractedTasks.synthese}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b">
                  <th className="pb-2">Qui</th>
                  <th className="pb-2">Quoi</th>
                  <th className="pb-2">Quand</th>
                  <th className="pb-2">Priorité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {extractedTasks.taches.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 font-bold text-slate-700">{t.qui}</td>
                    <td className="py-2 text-slate-600">{t.quoi}</td>
                    <td className="py-2 font-mono text-slate-500">{t.quand}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold">
                        {t.priorite}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && !statusText.includes('procès-verbal') && !statusText.includes('tâches') && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border p-6 flex flex-col items-center gap-3 max-w-xs">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-700">{statusText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
