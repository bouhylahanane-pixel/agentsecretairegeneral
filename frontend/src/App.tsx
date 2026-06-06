import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/chatcontext';
import { ApiErrorProvider, useApiError } from './contexts/ApiErrorContext';
import { registerNetworkErrorCallback } from './api/client';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Importation de nos pages V1
import Dashboard from './pages/DashboardPage';
import PVGenerator from './pages/PVGeneratorPage';
import Meetings from './pages/MeetingsPage';
import DocumentGeneratorPage from './pages/DocumentGeneratorPage';
import UsersPage from './pages/UsersPage';
import HistoriquePage from './pages/HistoriquePage';

function AppContent() {
  const { triggerConnectionError } = useApiError();

  useEffect(() => {
    registerNetworkErrorCallback(() => {
      triggerConnectionError();
    });
  }, [triggerConnectionError]);

  return (
    <Routes>
      {/* Routes Publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Redirections d'anciennes URLs vers les nouvelles V1 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/document-generation" element={<Navigate to="/documents" replace />} />
      <Route path="/pv-generator" element={<Navigate to="/proces-verbaux" replace />} />
      <Route path="/meetings" element={<Navigate to="/reunions" replace />} />
      <Route path="/document-safe-and-logs" element={<Navigate to="/historique" replace />} />

      {/* Routes Protégées V1 */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<ProtectedRoute resource="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute resource="documents"><DocumentGeneratorPage /></ProtectedRoute>} />
        <Route path="/proces-verbaux" element={<ProtectedRoute resource="procesVerbaux"><PVGenerator /></ProtectedRoute>} />
        <Route path="/reunions" element={<ProtectedRoute resource="reunions"><Meetings /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute resource="users"><UsersPage /></ProtectedRoute>} />
        <Route path="/historique" element={<ProtectedRoute resource="historique"><HistoriquePage /></ProtectedRoute>} />
      </Route>

      {/* Fallback global */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <ApiErrorProvider>
            <AppContent />
          </ApiErrorProvider>
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
}