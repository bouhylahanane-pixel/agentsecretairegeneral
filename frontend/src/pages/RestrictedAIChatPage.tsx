import React, { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, Loader2, Bot, User, AlertCircle, Mic, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../api/chatApi';

type ChatMessage = {
  id: string;
  sender: 'user' | 'agent';
  content: string;
};

export default function RestrictedAIChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      content: `Bonjour ${user?.name || ''}. Je suis l'Assistant IA Sécurisé. Je peux uniquement répondre à vos questions en me basant sur vos documents officiels (Attestations, PV, etc.) enregistrés dans votre coffre-fort numérique. Comment puis-je vous aider ?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setIsTranscribing(true);
        try {
          const { text } = await chatApi.transcribeAudio(audioBlob);
          if (text) {
            setInput(prev => prev + (prev ? ' ' : '') + text);
          }
        } catch (error) {
          console.error("Erreur de transcription:", error);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erreur d'accès au micro:", error);
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { response } = await chatApi.askRestrictedChat(input);
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: response
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: "Désolé, une erreur est survenue lors de la communication avec le serveur."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 shrink-0 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <MessageSquareText className="w-6 h-6 text-sky-600" />
            Assistant IA Restreint
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Interface conversationnelle (RAG) sur vos documents stricts.
          </p>
        </div>
        <div className="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Accès aux données globales désactivé
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                msg.sender === 'user' 
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' 
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-3.5 rounded-2xl text-sm ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-slate-500 text-xs italic">Recherche dans vos documents...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Enregistrement en cours..." : isTranscribing ? "Transcription en cours..." : "Posez une question sur vos documents..."}
              className={`w-full pl-4 pr-24 py-3.5 bg-white dark:bg-slate-950 border ${isRecording ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-slate-200 dark:border-slate-800'} rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all`}
              disabled={loading || isRecording || isTranscribing}
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center justify-center animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={loading || isTranscribing}
                  className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || loading || isRecording || isTranscribing}
                className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
            LLaMA 3.3 RAG - Contexte cloisonné à l'espace de l'employé
          </p>
        </div>
      </div>
    </div>
  );
}
