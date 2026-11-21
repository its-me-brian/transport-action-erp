import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NoAccessScreenProps {
  /** Route the user is allowed to open, computed from their permissions. */
  homeRoute: string;
}

/**
 * Shown when a signed-in user opens a URL they have no permission for.
 * Before this existed the route rendered anyway and the first API call
 * answered 403, which surfaced as a rendering crash.
 */
export default function NoAccessScreen({ homeRoute }: NoAccessScreenProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h1 className="text-[16px] font-semibold text-on-surface mb-1">No access to this section</h1>
        <p className="text-[13px] text-on-surface-variant mb-1">
          {user?.username ? `Signed in as ${user.username}.` : 'Your session is active.'}
        </p>
        <p className="text-[12px] text-on-surface-variant mb-5">
          Your role{user?.role ? ` (${user.role})` : ''} does not include this permission.
          Ask an administrator to review your access.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {homeRoute !== '/no-access' && (
            <button
              onClick={() => navigate(homeRoute, { replace: true })}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              Go to my dashboard
            </button>
          )}
          <button
            onClick={() => logout()}
            className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-dim/50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
