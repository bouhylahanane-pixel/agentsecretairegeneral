import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Upload, 
  Loader2, 
  FileText, 
  Download, 
  Sparkles, 
  Users, 
  FileAudio,
  AlertCircle,
  Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useApiError } from '../contexts/ApiErrorContext';
import { getDownloadUrl } from '../api/client';
import { api } from '../api/endpoints';

export default function PVGeneratorPage() {
  const { setBackendOffline } = useApiError();
  const [agenda, setAgenda] = useState('');
  const [participants, setParticipants] = useState('Meryem, Sanaa, Ahmed');
  const [transcription, setTranscription] = useState('');
  const [pvMarkdown, setPvMarkdown] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Format recording timer: mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording audio
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleSendAudio(audioBlob);
        
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      alert("Impossible d'accéder au microphone. Veuillez vérifier les permissions dans votre navigateur.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Process audio (Mic or File) -> Transcribe -> Generate Minutes
  const processAudioFlow = async (audioBlob: Blob) => {
    setLoading(true);
    setBackendOffline(false);
    try {
      // 1. Transcription
      setLoadingStep("Transcription vocale en cours...");
      const transcribeRes = await api.transcribeAudio(audioBlob);
      const transcribedText = transcribeRes.data.text;
      
      if (!transcribedText) {
        throw new Error("Aucune transcription n'a pu être extraite.");
      }
      
      setTranscription(transcribedText);

      // 2. Structuration du PV avec les paramètres de la réunion
      setLoadingStep("Génération du procès-verbal par l'IA...");
      const parts = participants.split(',').map(p => p.trim()).filter(Boolean);
      const minutesRes = await api.generateMinutes({
        ordre_du_jour: agenda || "Réunion de travail",
        participants: parts.length > 0 ? parts : ["Anonyme"],
        notes_brutes: transcribedText,
        date_reunion: new Date().toISOString().split('T')[0]
      });

      setPvMarkdown(minutesRes.data.pv_markdown || "Échec de la structuration.");
      setPdfPath(minutesRes.data.pdf_path || "");

    } catch (err: any) {
      console.error("Erreur de génération PV:", err);
      if (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setBackendOffline(true);
      }
      alert(`Erreur: ${err.response?.data?.detail || err.message || "Une erreur est survenue lors de la génération du PV."}`);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Post raw micro audio to backend
  const handleSendAudio = async (audioBlob: Blob) => {
    await processAudioFlow(audioBlob);
  };

  // Handle file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await processAudioFlow(file);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""; // clear file input
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4 transition-colors duration-300">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2 transition-colors duration-300">
            <FileAudio className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
            Minutes & Task Extraction (PV Generator)
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-450 font-semibold mt-0.5 transition-colors duration-300">
            Dictez en direct ou importez vos enregistrements pour générer des PV officiels par l'IA.
          </p>
        </div>
      </div>

      {/* Input Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Agenda field */}
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-2 transition-colors duration-300">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors duration-300">
            Ordre du jour de la Réunion
          </label>
          <textarea
            placeholder="Saisissez l'ordre du jour ou le sujet principal..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-550 focus:border-transparent transition-all"
          />
        </div>

        {/* Participants field */}
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-2 transition-colors duration-300">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 transition-colors duration-300">
            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
            Membres Participants (séparés par des virgules)
          </label>
          <input
            type="text"
            placeholder="ex: Meryem, Sanaa, Ahmed"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-550 focus:border-transparent transition-all"
          />
        </div>

      </div>

      {/* Audio Acquisition Buttons */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/20 p-4 border border-slate-200 dark:border-slate-850 rounded-2xl transition-colors duration-300">
        
        {/* Record trigger */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-sm dark:shadow-lg dark:shadow-rose-600/10 transition-all"
          >
            <Square className="w-4 h-4 shrink-0 fill-current animate-pulse" />
            Stop ({formatTime(recordTime)})
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-gradient-to-r dark:from-indigo-650 dark:to-indigo-600 dark:hover:from-indigo-600 dark:hover:to-indigo-500 active:scale-95 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-sm dark:shadow-lg dark:shadow-indigo-600/10 transition-all disabled:opacity-50"
          >
            <Mic className="w-4 h-4 shrink-0 text-white" />
            🎙️ Dicter Micro
          </button>
        )}

        {/* File import trigger */}
        <button
          type="button"
          disabled={loading || isRecording}
          onClick={triggerFileInput}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 active:scale-95 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-black tracking-widest uppercase rounded-xl border border-slate-200 dark:border-slate-800 transition-all disabled:opacity-50"
        >
          <Upload className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 transition-colors duration-300" />
          📥 Importer Audio
        </button>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept="audio/*"
          className="hidden"
        />

        {/* Recording active indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-rose-450 font-bold text-[11px] animate-pulse ml-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Enregistrement audio en cours...
          </div>
        )}
      </div>

      {/* Loading state bar */}
      {loading && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300 transition-colors duration-300">
          <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin transition-colors duration-300" />
          <span className="font-bold animate-pulse">{loadingStep}</span>
        </div>
      )}

      {/* Results side-by-side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Raw Transcription Notes */}
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-3.5 flex flex-col min-h-[400px] transition-colors duration-300">
          <h3 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-850 pb-2.5 flex items-center gap-2 transition-colors duration-300">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-colors duration-300" />
            Notes brutes de réunion (Transcription)
          </h3>
          <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-850 rounded-xl overflow-y-auto text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-mono transition-colors duration-300">
            {transcription ? (
              <p className="whitespace-pre-wrap">{transcription}</p>
            ) : (
              <span className="text-slate-500 dark:text-slate-655 italic text-xs transition-colors duration-300">Les notes transcrites s'afficheront ici après l'audio...</span>
            )}
          </div>
        </div>

        {/* Right: Beautiful Markdown Generated PV */}
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-3.5 flex flex-col min-h-[400px] transition-colors duration-300">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-2 transition-colors duration-300">
            <h3 className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2 transition-colors duration-300">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 transition-colors duration-300" />
              Document généré (Procès-Verbal)
            </h3>
            
            {pdfPath && (
              <a
                href={getDownloadUrl(pdfPath)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-650 dark:hover:bg-emerald-600 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm dark:shadow-md dark:shadow-emerald-600/10 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                Télécharger le PDF Officiel
              </a>
            )}
          </div>

          <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-850 rounded-xl overflow-y-auto markdown-body transition-colors duration-300">
            {pvMarkdown ? (
              <ReactMarkdown>{pvMarkdown}</ReactMarkdown>
            ) : (
              <span className="text-slate-500 dark:text-slate-655 italic text-xs block transition-colors duration-300">Le PV structuré s'affichera ici après le traitement de l'IA...</span>
            )}
          </div>
        </div>

      </div>

      {/* Safety Info Note */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-850 rounded-2xl flex gap-3 text-xs text-slate-600 dark:text-slate-500 items-start transition-colors duration-300">
        <AlertCircle className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          Les enregistrements audio sont traités confidentiellement à l'aide du modèle Whisper (Groq Cloud API). Les comptes-rendus et livrables PDF officiels générés respectent la charte graphique réglementaire de l'entreprise.
        </div>
      </div>

    </div>
  );
}