import { useState } from 'react';
import { api } from '../api/endpoints';
import { useChat } from '../contexts/chatcontext';
import { useUser } from '../contexts/UserContext';

export function useAgent() {
  const [sending, setSending] = useState(false);
  const { addMessage } = useChat();
  const { user } = useUser();

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Ajouter immédiatement le message de l'utilisateur à l'interface
    addMessage({ sender: 'user', text });
    setSending(true);

    try {
      // 2. Transmettre la requête à l'agent FastAPI
      const res = await api.processMessage(text, user);
      
      // 3. Injecter la réponse de l'agent avec ses métadonnées (fichiers attachés)
      addMessage({
        sender: 'assistant',
        text: res.data.response || res.data.result,
        pdfPath: res.data.pdf_path,
        audioPath: res.data.audio_path,
      });
    } catch (err) {
      console.error("Erreur lors de la communication avec l'agent IA :", err);
      addMessage({
        sender: 'assistant',
        text: "Désolé, une erreur de liaison est survenue. L'agent intelligent est injoignable pour le moment.",
      });
    } finally {
      setSending(false);
    }
  };

  return { sendMessage, sending };
}