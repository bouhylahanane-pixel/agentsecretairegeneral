import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/chatcontext';
import { ApiErrorProvider, useApiError } from './contexts/ApiErrorContext';
import { registerNetworkErrorCallback } from './api/client';
import { getDefaultRoute } from './auth/permissions';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// ─── Pages Secrétariat ───
import Dashboard from './pages/DashboardPage';
import MeetingsPage from './pages/MeetingsPage';
import PVGeneratorPage from './pages/PVGeneratorPage';
import DocumentTemplatesPage from './pages/DocumentTemplatesPage';
import PendingRequestsPage from './pages/PendingRequestsPage';

// ─── Pages Admin ───
import UsersPage from './pages/UsersPage';
import AdminApiKeysPage from './pages/AdminApiKeysPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';

// ─── Pages Employé ───
import EmployeeCalendarPage from './pages/EmployeeCalendarPage';
import EmployeeDocumentsPage from './pages/EmployeeDocumentsPage';
import RestrictedAIChatPage from './pages/RestrictedAIChatPage';
import NewRequestPage from './pages/NewRequestPage';

// ─── Pages Stagiaire ───
import InternshipSpacePage from './pages/InternshipSpacePage';
import InternReadOnlyDocsPage from './pages/InternReadOnlyDocsPage';

/** Smart root redirect based on the user's role */
function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}

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

      {/* Smart root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* ─── Routes Protégées ─── */}
      <Route element={<AppLayout />}>
        {/* Secrétariat */}
        <Route path="/dashboard" element={<ProtectedRoute resource="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/reunions" element={<ProtectedRoute resource="reunions"><MeetingsPage /></ProtectedRoute>} />
        <Route path="/ia-pv" element={<ProtectedRoute resource="ia_pv"><PVGeneratorPage /></ProtectedRoute>} />
        <Route path="/gabarits" element={<ProtectedRoute resource="gabarits"><DocumentTemplatesPage /></ProtectedRoute>} />
        <Route path="/demandes-attente" element={<ProtectedRoute resource="demandes_secretaire"><PendingRequestsPage /></ProtectedRoute>} />

        {/* Employé */}
        <Route path="/calendrier" element={<ProtectedRoute resource="calendrier"><EmployeeCalendarPage /></ProtectedRoute>} />
        <Route path="/mes-documents" element={<ProtectedRoute resource="mes_documents"><EmployeeDocumentsPage /></ProtectedRoute>} />
        <Route path="/chat-restreint" element={<ProtectedRoute resource="chat_ia_restreint"><RestrictedAIChatPage /></ProtectedRoute>} />
        <Route path="/nouvelle-demande" element={<ProtectedRoute resource="nouvelle_demande"><NewRequestPage /></ProtectedRoute>} />

        {/* Stagiaire */}
        <Route path="/espace-stage" element={<ProtectedRoute resource="espace_stage"><InternshipSpacePage /></ProtectedRoute>} />
        <Route path="/mes-docs-stage" element={<ProtectedRoute resource="docs_stage_lecture"><InternReadOnlyDocsPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/users" element={<ProtectedRoute resource="users"><UsersPage /></ProtectedRoute>} />
        <Route path="/api-keys" element={<ProtectedRoute resource="apiKeys"><AdminApiKeysPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute resource="auditLogs"><AdminAuditLogsPage /></ProtectedRoute>} />
      </Route>

      {/* Fallback → smart redirect */}
      <Route path="*" element={<RootRedirect />} />
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