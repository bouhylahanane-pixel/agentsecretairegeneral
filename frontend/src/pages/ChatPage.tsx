import { useState, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import { api } from '../api/endpoints';
import { getDownloadUrl } from '../api/client';
import MessageList from '../components/chat/MessageList';
import { Send, Trash2 } from 'lucide-react';

export default function ChatPage() {
  const { messages, addMessage, clearChat } = useChat();
  const { user } = useUser();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    setInput('');
    addMessage({ sender: 'user', text: userText });
    setSending(true);

    try {
      const response = await api.processMessage(userText, user);
      const data = response.data;
      
      // Sécurité : On récupère l'url du PDF via le helper global d'étape 1
      const docUrl = data.pdf_path ? getDownloadUrl(data.pdf_path) : undefined;

      addMessage({
        sender: 'agent',
        text: data.response || data.result,
        action: data.action,
        downloadUrl: docUrl,
      });
    } catch (err) {
      addMessage({
        sender: 'agent',
        text: "Désolé, une erreur est survenue lors de la communication avec l'agent.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Top bar chat */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 transition-colors duration-300">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors duration-300">Discussion avec l'Agent IA</span>
        <button 
          onClick={clearChat}
          className="text-xs flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Effacer l'historique
        </button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} sending={sending} />

      {/* Formulaire Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-4 shrink-0 transition-colors duration-300">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Générer une attestation de stage pour Adam Rami..."
          disabled={sending}
          className="flex-1 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-550 shadow-sm disabled:bg-slate-100 dark:disabled:bg-slate-900 transition-colors duration-300"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-650 dark:hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all flex items-center justify-center disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:shadow-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}