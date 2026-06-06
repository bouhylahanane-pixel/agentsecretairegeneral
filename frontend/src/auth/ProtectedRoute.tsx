import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from './permissions';
import type { PermissionResource } from './permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource?: PermissionResource;
}

export default function ProtectedRoute({ children, resource }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Vérification des accès...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (resource && !hasPermission(user?.role, resource)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
