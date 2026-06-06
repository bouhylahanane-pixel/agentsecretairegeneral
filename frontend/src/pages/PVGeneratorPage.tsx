import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, MicOff, FileText, Loader2, Download, AlertTriangle, CheckCircle, FileAudio, Database } from 'lucide-react';
import { pvApi } from '../api/pvApi';

export default function PVGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'record' | 'text'>('import');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null); // Expecting { transcription, pv_markdown, pdf_path }

  // 1. Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 2. Record State
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Text State
  const [inputText, setInputText] = useState('');

  // 4. History
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    try {
      const data = await pvApi.getMeetingsHistory();
      setHistory(data);
    } catch (err) {
      console.error("Erreur historique PV", err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [result]); // Refresh history when a new PV is generated

  const handleResult = (data: any) => {
    setResult(data);
  };

  const handleError = (err: any) => {
    setError(err.response?.data?.detail || err.message || "Une erreur est survenue lors du traitement.");
  };

  const resetState = () => {
    setError(null);
    setResult(null);
    setLoading(true);
  };

  // ===================== IMPORT TAB =====================
  const handleUpload = async () => {
    if (!selectedFile) return;
    resetState();
    try {
      const data = await pvApi.uploadPv(selectedFile);
      handleResult(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // ===================== RECORD TAB =====================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Process
        resetState();
        try {
          const data = await pvApi.generatePv(audioBlob);
          handleResult(data);
        } catch (err) {
          handleError(err);
        } finally {
          setLoading(false);
        }
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(prev => prev + 1), 1000);
    } catch (err) {
      alert("Accès au microphone refusé ou non supporté par votre navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ===================== TEXT TAB =====================
  const handleStructureText = async () => {
    if (!inputText.trim()) return;
    resetState();
    try {
      const data = await pvApi.structureText(inputText);
      handleResult(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // ===================== UTILS =====================
  const handleDownload = async (path: string) => {
    try {
      await pvApi.downloadGeneratedFile(path);
    } catch (e) {
      alert("Erreur lors du téléchargement.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <FileAudio className="w-6 h-6 text-indigo-600" />
          Générateur de Procès-Verbaux
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Transcription vocale (Whisper) et structuration IA (LLaMA 3.3) pour PV automatiques.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Input Modes */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl flex gap-1 border border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab('import')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'import' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Import Audio</button>
            <button onClick={() => setActiveTab('record')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'record' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Microphone</button>
            <button onClick={() => setActiveTab('text')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'text' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Notes Texte</button>
          </div>

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm min-h-[250px] flex flex-col justify-center">
            
            {activeTab === 'import' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-500">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Importer un fichier audio</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Formats acceptés: MP3, WAV, M4A</p>
                </div>
                <input type="file" accept="audio/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="text-xs w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer text-slate-500" />
                <button disabled={loading || !selectedFile} onClick={handleUpload} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-3 h-3 animate-spin"/>} Transcrire & Générer PV
                </button>
              </div>
            )}

            {activeTab === 'record' && (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-6 rounded-full transition-all ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-indigo-50 text-indigo-500'}`}>
                  {isRecording ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Enregistrement en direct</h4>
                  <p className="text-xs font-mono text-slate-500 mt-1">{isRecording ? formatTime(recordTime) : 'Prêt à enregistrer'}</p>
                </div>
                {isRecording ? (
                  <button onClick={stopRecording} className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20">
                    Arrêter & Générer PV
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={loading} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-3 h-3 animate-spin"/>} Commencer l'enregistrement
                  </button>
                )}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="flex flex-col space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Notes ou Transcription Brute</h4>
                  <textarea rows={6} value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Collez ici les notes brutes de la réunion..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <button disabled={loading || !inputText} onClick={handleStructureText} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-3 h-3 animate-spin"/>} Structurer en PV Officiel
                </button>
              </div>
            )}

          </div>

          {/* History Widget */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Database className="w-4 h-4 text-slate-400"/> Historique récent
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {history.length > 0 ? history.map(item => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center group">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={item.objet}>{item.objet || "Réunion sans objet"}</p>
                    <p className="text-[9px] font-mono text-slate-500 mt-0.5">{item.date}</p>
                  </div>
                  {item.pdf_path && (
                    <button onClick={() => handleDownload(item.pdf_path)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white dark:bg-slate-800 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="w-3 h-3"/>
                    </button>
                  )}
                </div>
              )) : (
                <p className="text-xs text-slate-500 italic">Aucun PV archivé.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm min-h-[600px] flex flex-col relative">
            {loading ? (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 animate-pulse uppercase tracking-widest">Traitement IA en cours...</p>
                <p className="text-xs text-slate-500 mt-2">Génération du Procès-Verbal</p>
              </div>
            ) : null}

            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm font-semibold">Le résultat du PV s'affichera ici.</p>
              </div>
            )}

            {result && !loading && (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Procès-Verbal Généré
                  </h3>
                  {result.pdf_path && (
                    <button onClick={() => handleDownload(result.pdf_path)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-800/50">
                      <Download className="w-4 h-4" /> PDF Officiel
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-6">
                  {result.transcription && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Transcription brute (Whisper)</h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800/60 leading-relaxed">
                        {result.transcription}
                      </div>
                    </div>
                  )}
                  {result.pv_markdown && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Structuration IA (LLaMA 3.3)</h4>
                      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-inner prose prose-sm dark:prose-invert max-w-none">
                        {/* Simple markdown render fallback if ReactMarkdown is not imported, since we don't want to install new packages. Let's just render the text with whitespace preserved. */}
                        <pre className="font-sans whitespace-pre-wrap">{result.pv_markdown}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}