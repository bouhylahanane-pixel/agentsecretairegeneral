import { useEffect, useRef } from 'react';
import { FileDown, Bot, User, Volume2 } from 'lucide-react';
import { getDownloadUrl } from '../../api/client';
import type { Message } from '../../contexts/chatcontext';

interface MessageListProps {
  messages: Message[];
  sending: boolean;
}

export default function MessageList({ messages, sending }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas dès qu'un nouveau message apparaît ou que l'IA réfléchit
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div key={msg.id} className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
            {/* Avatar circulaire */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 shadow-sm ${
              isUser ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-indigo-600'
            }`}>
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bulle de texte */}
            <div className="space-y-2">
              <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm border ${
                isUser 
                  ? 'bg-indigo-600 border-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
                
                {/* Pièces jointes multimédias générées par l'IA */}
                {(!isUser && (msg.pdfPath || msg.audioPath)) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {/* Lien de téléchargement PDF */}
                    {msg.pdfPath && (
                      <a
                        href={getDownloadUrl(msg.pdfPath)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Télécharger l'Acte (PDF)
                      </a>
                    )}
                    
                    {/* Lecteur Audio Intégré pour la synthèse vocale */}
                    {msg.audioPath && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700 w-full sm:w-auto">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <audio src={getDownloadUrl(msg.audioPath)} controls className="h-5 w-40 accent-emerald-600" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Horodatage discret sous la bulle */}
              <p className={`text-[9px] font-mono text-slate-400 ${isUser ? 'text-right' : 'text-left'}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        );
      })}

      {/* Indicateur visuel d'attente pendant que l'agent génère sa réponse */}
      {sending && (
        <div className="flex gap-3 mr-auto max-w-2xl items-center">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      )}
      
      {/* Point d'ancrage pour le scroll automatique */}
      <div ref={bottomRef} />
    </div>
  );
}