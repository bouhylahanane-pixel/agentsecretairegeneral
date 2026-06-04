import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  // Liste d'actions administratives pré-configurées pour le Secrétariat Général
  const quickActions = [
    "Rédiger une attestation de travail pour un agent",
    "Planifier une réunion du Conseil pour jeudi à 10h",
    "Vérifier le statut des dernières urgences administratives"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleQuickAction = (action: string) => {
    if (disabled) return;
    onSend(action);
  };

  return (
    <div className="p-4 bg-white border-t border-slate-200/80 shrink-0 shadow-sm">
      <div className="max-w-3xl mx-auto space-y-3">
        
        {/* Puces de suggestions rapides d'actions IA */}
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleQuickAction(action)}
              className="text-[10px] font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
              {action}
            </button>
          ))}
        </div>

        {/* Formulaire de saisie principal */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder={disabled ? "L'agent IA analyse votre demande..." : "Demandez une rédaction d'acte, une planification ou une analyse..."}
            className="flex-1 text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-60 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="p-3 bg-indigo-600 border border-indigo-700 text-white rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none transition-all shadow-sm shadow-indigo-600/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        
      </div>
    </div>
  );
}