import { useState, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import { api } from '../api/endpoints';
import { getDownloadUrl } from '../api/client';
import MessageItem from '../components/chat/MessageItem';
import { Send, Trash2 } from 'lucide-react';

export default function ChatPage() {
  const { messages, addMessage, clearChat } = useChat();
  const { user } = useUser();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
      {/* Top bar chat */}
      <div className="h-14 border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-gray-600">Discussion avec l'Agent IA</span>
        <button 
          onClick={clearChat}
          className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-rose-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Effacer l'historique
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        {sending && (
          <div className="p-5 flex gap-4 bg-slate-50 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white animate-pulse">🤖</div>
            <div className="space-y-2 mt-1">
              <span className="text-xs font-semibold text-indigo-600 animate-pulse">L'agent analyse et formule une réponse...</span>
              <div className="flex gap-1.5 items-center pt-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Formulaire Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-gray-50 flex gap-4 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Générer une attestation de stage pour Adam Rami..."
          disabled={sending}
          className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 shadow-sm disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="px-5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center disabled:bg-gray-300 disabled:shadow-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}