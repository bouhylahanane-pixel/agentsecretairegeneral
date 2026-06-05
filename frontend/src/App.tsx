import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { ChatProvider } from './contexts/chatcontext';
import { ApiErrorProvider, useApiError } from './contexts/ApiErrorContext';
import { registerNetworkErrorCallback } from './api/client';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';

// Importation de nos pages fonctionnelles
import Dashboard from './pages/DashboardPage';
import PVGenerator from './pages/PVGeneratorPage';
import Meetings from './pages/MeetingsPage';
import DocumentSafeAndLogsPage from './pages/DocumentSafeAndLogsPage';
import DocumentGeneratorPage from './pages/DocumentGeneratorPage';
import ChatPage from './pages/ChatPage';
import AgentChat from './pages/AgentChat';

// Ce composant protège les pages de ton site
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  
  if (user) {
    return <AppLayout>{children}</AppLayout>;
  }
  
  return <LoginPage />;
}

// Sous-composant pour initialiser les hooks contextuels
function AppContent() {
  const { triggerConnectionError } = useApiError();

  useEffect(() => {
    // Enregistre le callback d'erreur réseau pour déclencher la modale/bannière globale
    registerNetworkErrorCallback(() => {
      triggerConnectionError();
    });
  }, [triggerConnectionError]);

  return (
    <Routes>
      <Route path="/" element={<NavigationGuard><Dashboard /></NavigationGuard>} />
      <Route path="/document-generation" element={<NavigationGuard><DocumentGeneratorPage /></NavigationGuard>} />
      <Route path="/meetings" element={<NavigationGuard><Meetings /></NavigationGuard>} />
      <Route path="/pv-generator" element={<NavigationGuard><PVGenerator /></NavigationGuard>} />
      <Route path="/document-safe-and-logs" element={<NavigationGuard><DocumentSafeAndLogsPage /></NavigationGuard>} />
      <Route path="/chat" element={<NavigationGuard><ChatPage /></NavigationGuard>} />
      <Route path="/agent-chat" element={<NavigationGuard><AgentChat /></NavigationGuard>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// ATTENTION ICI : Le "export default" indispensable pour main.tsx !
export default function App() {
  return (
    <Router>
      <UserProvider>
        <ChatProvider>
          <ApiErrorProvider>
            <AppContent />
          </ApiErrorProvider>
        </ChatProvider>
      </UserProvider>
    </Router>
  );
}