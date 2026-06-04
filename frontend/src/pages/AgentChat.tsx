import React, { useRef, useEffect } from 'react';
import { Trash2, Mic, Square, Loader2, FileDown } from 'lucide-react';
import { useChat } from '../contexts/chatcontext';
import { useAgent } from '../hooks/useAgent';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { api } from '../api/endpoints';
import { getDownloadUrl } from '../api/client';
import type { Message } from '../contexts/chatcontext';

function MessageList({ messages, sending }: { messages: Message[]; sending?: boolean }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {messages.length === 0 && !sending ? (
        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic py-20">
          Aucun message pour le moment. Commencez la discussion.
        </div>
      ) : (
        messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              {/* Expéditeur & Heure */}
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-slate-400">
                <span>{isUser ? 'Meryem (Vous)' : 'Assistant IA'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              {/* Bulle de message */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed border ${
                  isUser
                    ? 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none'
                    : 'bg-white border-slate-200/85 text-slate-700 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Pièces jointes PDF / Audio */}
                {(m.pdfPath || m.audioPath) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100/20 space-y-1.5">
                    {m.pdfPath && (
                      <a
                        href={getDownloadUrl(m.pdfPath)}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          isUser
                            ? 'bg-indigo-700 hover:bg-indigo-800 border-indigo-800 text-white'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Télécharger le document PDF
                      </a>
                    )}
                    {m.audioPath && (
                      <div className="flex items-center gap-2">
                        <audio
                          src={getDownloadUrl(m.audioPath)}
                          controls
                          className="h-7 w-48 max-w-full text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      {sending && (
        <div className="flex flex-col items-start space-y-1">
          <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-slate-400 animate-pulse">
            <span>Assistant IA est en train de réfléchir...</span>
          </div>
          <div className="bg-white border border-slate-200/80 text-slate-500 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs shadow-sm flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Génération de la réponse...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInput({ onSend, disabled }: { onSend: (message: string) => void; disabled?: boolean }) {
  const [input, setInput] = React.useState('');
  const [isTranscribing, setIsTranscribing] = React.useState(false);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const res = await api.transcribeAudio(audioBlob);
      if (res.data && res.data.text) {
        setInput(res.data.text);
      }
    } catch (err) {
      console.error("Erreur transcription :", err);
      alert("Une erreur est survenue lors de la transcription de l'audio.");
    } finally {
      setIsTranscribing(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200/80 shrink-0">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        {/* Saisie texte / Indicateurs d'état */}
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isRecording
                ? "Enregistrement micro actif..."
                : isTranscribing
                ? "Transcription de votre voix en cours..."
                : "Entrez votre message..."
            }
            disabled={disabled || isRecording || isTranscribing}
            className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs disabled:bg-slate-50 disabled:cursor-not-allowed focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {/* Bouton Micro / Enregistrement intégré à l'input */}
          <div className="absolute right-2 flex items-center gap-1">
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 transition-colors"
                title="Arrêter l'enregistrement"
              >
                <Square className="w-3.5 h-3.5 fill-rose-600 animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={startRecording}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors disabled:opacity-50"
                title="Enregistrer votre voix"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bouton d'envoi */}
        <button
          type="submit"
          disabled={disabled || !input.trim() || isRecording || isTranscribing}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:pointer-events-none"
        >
          Envoyer
        </button>
      </div>

      {/* Barre d'état d'enregistrement actif */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 mt-2 py-1 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 animate-pulse text-[10px] font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
          <span>🎙️ PARLEZ MAINTENANT... CLIQUEZ SUR LE CARRÉ ROUGE POUR ARRÊTER</span>
        </div>
      )}
    </form>
  );
}

export default function AgentChat() {
  const { messages, clearChat } = useChat();
  const { sendMessage, sending } = useAgent();

  const handleClear = () => {
    if (window.confirm("Voulez-vous réinitialiser l'historique de cette session de travail ?")) {
      clearChat();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50/50">
      
      {/* Bandeau d'actions de la Discussion */}
      <div className="h-12 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Agent Autonome Administratif</span>
          <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-semibold">
            v2.4
          </span>
        </div>
        
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold border border-transparent hover:border-rose-100 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vider le chat
          </button>
        )}
      </div>

      {/* 1. Zone centrale : Défilement des messages */}
      <MessageList messages={messages} sending={sending} />

      {/* 2. Zone inférieure : Formulaire de saisie fixe */}
      <ChatInput onSend={sendMessage} disabled={sending} />

    </div>
  );
}