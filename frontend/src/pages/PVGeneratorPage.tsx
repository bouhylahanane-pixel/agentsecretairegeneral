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
import { API_URL } from '../config';

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

  // Post raw micro audio to backend
  const handleSendAudio = async (audioBlob: Blob) => {
    setLoading(true);
    setLoadingStep("Transcription de la réunion via Whisper...");
    try {
      const response = await fetch(`${API_URL}/agent/generate-pv`, {
        method: "POST",
        headers: {
          "Content-Type": "audio/wav",
        },
        body: audioBlob,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Erreur de génération PV");
      }

      const data = await response.json();
      setTranscription(data.transcription || "Aucune transcription brute renvoyée.");
      setPvMarkdown(data.pv_markdown || "Échec de structuration du PV.");
      setPdfPath(data.pdf_path || "");
      setBackendOffline(false);
    } catch (err: any) {
      console.error("Audio generation error:", err);
      if (err.message.includes('Failed to fetch') || err.code === 'ERR_NETWORK') {
        setBackendOffline(true);
      }
      alert(`Erreur: ${err.message || "Impossible de joindre le serveur de transcription."}`);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // Handle file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingStep("Importation et transcription du fichier audio...");
    try {
      const response = await fetch(`${API_URL}/agent/upload-pv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": file.name,
        },
        body: file,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Erreur de traitement du fichier");
      }

      const data = await response.json();
      setTranscription(data.transcription || "Aucune transcription brute renvoyée.");
      setPvMarkdown(data.pv_markdown || "Échec de structuration du PV.");
      setPdfPath(data.pdf_path || "");
      setBackendOffline(false);
    } catch (err: any) {
      console.error("File upload error:", err);
      if (err.message.includes('Failed to fetch') || err.code === 'ERR_NETWORK') {
        setBackendOffline(true);
      }
      alert(`Erreur lors de l'import: ${err.message || "Échec de connexion."}`);
    } finally {
      setLoading(false);
      setLoadingStep("");
      if (fileInputRef.current) fileInputRef.current.value = ""; // clear file input
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-100 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-indigo-400" />
            Minutes & Task Extraction (PV Generator)
          </h2>
          <p className="text-[11px] text-slate-450 font-semibold mt-0.5">
            Dictez en direct ou importez vos enregistrements pour générer des PV officiels par l'IA.
          </p>
        </div>
      </div>

      {/* Input Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Agenda field */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Ordre du jour de la Réunion
          </label>
          <textarea
            placeholder="Saisissez l'ordre du jour ou le sujet principal..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-850 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-550 focus:border-transparent transition-all"
          />
        </div>

        {/* Participants field */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Membres Participants (séparés par des virgules)
          </label>
          <input
            type="text"
            placeholder="ex: Meryem, Sanaa, Ahmed"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-850 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-550 focus:border-transparent transition-all"
          />
        </div>

      </div>

      {/* Audio Acquisition Buttons */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900/20 p-4 border border-slate-850 rounded-2xl">
        
        {/* Record trigger */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-lg shadow-rose-600/10 transition-all"
          >
            <Square className="w-4 h-4 shrink-0 fill-current animate-pulse" />
            Stop ({formatTime(recordTime)})
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-650 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 active:scale-95 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-lg shadow-indigo-600/10 transition-all disabled:opacity-50"
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
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-300 hover:text-white text-xs font-black tracking-widest uppercase rounded-xl border border-slate-800 transition-all disabled:opacity-50"
        >
          <Upload className="w-4 h-4 shrink-0 text-slate-400" />
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
        <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-xs text-indigo-300">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="font-bold animate-pulse">{loadingStep}</span>
        </div>
      )}

      {/* Results side-by-side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Raw Transcription Notes */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col min-h-[400px]">
          <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase border-b border-slate-850 pb-2.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Notes brutes de réunion (Transcription)
          </h3>
          <div className="flex-1 bg-slate-950/50 p-4 border border-slate-850 rounded-xl overflow-y-auto text-sm text-slate-350 leading-relaxed font-mono">
            {transcription ? (
              <p className="whitespace-pre-wrap">{transcription}</p>
            ) : (
              <span className="text-slate-655 italic text-xs">Les notes transcrites s'afficheront ici après l'audio...</span>
            )}
          </div>
        </div>

        {/* Right: Beautiful Markdown Generated PV */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3.5 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Document généré (Procès-Verbal)
            </h3>
            
            {pdfPath && (
              <a
                href={getDownloadUrl(pdfPath)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-650 hover:bg-emerald-600 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md shadow-emerald-600/10 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                Télécharger le PDF Officiel
              </a>
            )}
          </div>

          <div className="flex-1 bg-slate-950/50 p-4 border border-slate-850 rounded-xl overflow-y-auto markdown-body">
            {pvMarkdown ? (
              <ReactMarkdown>{pvMarkdown}</ReactMarkdown>
            ) : (
              <span className="text-slate-655 italic text-xs block">Le PV structuré s'affichera ici après le traitement de l'IA...</span>
            )}
          </div>
        </div>

      </div>

      {/* Safety Info Note */}
      <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-2xl flex gap-3 text-xs text-slate-500 items-start">
        <AlertCircle className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          Les enregistrements audio sont traités confidentiellement à l'aide du modèle Whisper (Groq Cloud API). Les comptes-rendus et livrables PDF officiels générés respectent la charte graphique réglementaire de l'entreprise.
        </div>
      </div>

    </div>
  );
}