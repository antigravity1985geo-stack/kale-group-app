import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'accountant' | 'consultant'>;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, requireAuth = false }: Props) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-900 animate-spin" />
      </div>
    );
  }

  // Only hard-block if requireAuth is explicitly set AND user is not logged in
  if (requireAuth && !user) return <Navigate to="/" replace />;

  // If logged in but wrong role → redirect home
  if (user && allowedRoles && profile?.role && !allowedRoles.includes(profile.role as any)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
