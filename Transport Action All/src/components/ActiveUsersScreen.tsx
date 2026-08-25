import React, { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, Clock, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { gasPost } from '../services/api';
import { Skeleton } from './ui/Skeleton';

interface PresenceUser {
  UserID: string;
  SessionID: string;
  Email: string;
  Role: string;
  LastSeen: string;
  UserAgent: string;
  IPAddress: string;
  StartedAt: string;
}

interface ActiveUserRowProps {
  user: PresenceUser;
  getTimeSince: (dateStr: string) => string;
  getRoleBadge: (role: string) => React.ReactNode;
  isRecent: (dateStr: string) => boolean;
}

const ActiveUserRow = React.memo(function ActiveUserRow({ user, getTimeSince, getRoleBadge, isRecent }: ActiveUserRowProps) {
  return (
    <tr key={user.SessionID} className="hover:bg-surface-container-low transition-colors">
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isRecent(user.LastSeen) ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <Wifi className={`w-4 h-4 ${isRecent(user.LastSeen) ? 'text-green-500' : 'text-yellow-500'}`} />
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3">
        <div>
          <div className="font-medium text-on-surface">{user.Email}</div>
          <div className="text-[11px] text-on-surface-variant">{user.UserID}</div>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3">{getRoleBadge(user.Role)}</td>
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
          {getTimeSince(user.LastSeen)}
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 text-[11px] text-on-surface-variant font-mono">
        {user.SessionID?.substring(0, 12)}...
      </td>
      <td className="px-3 sm:px-4 py-3 text-on-surface-variant">
        {user.IPAddress || '—'}
      </td>
    </tr>
  );
});

interface ActiveUsersScreenProps {
  onNavigate: (screen: string) => void;
}

export default function ActiveUsersScreen({ onNavigate }: ActiveUsersScreenProps) {
  const { token, can } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await gasPost('getActiveUsers', { token });
      if (Array.isArray(result)) {
        setUsers(result);
      }
    } catch (err) {
      console.error('Failed to load active users:', err);
      showToast('Error al cargar usuarios activos', 'error');
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, [loadUsers]);

  const getTimeSince = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Admin</span>;
      case 'coordinator': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Coordinator</span>;
      case 'accounting': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Accounting</span>;
      case 'driver': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Driver</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100">{role}</span>;
    }
  };

  const isRecent = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    return diffMs < 5 * 60 * 1000; // 5 minutes
  };

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Active Users</h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Real-time presence tracking via heartbeat
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-on-surface-variant">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-on-surface">
            {new Set(users.map(u => u.UserID)).size}
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">Unique Users</div>
          {users.length > new Set(users.map(u => u.UserID)).size && (
            <div className="text-[10px] text-on-surface-variant mt-0.5">{users.length} sessions</div>
          )}
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-blue-600">
            {new Set(users.filter(u => u.Role === 'coordinator').map(u => u.UserID)).size}
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">Coordinators</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-green-600">
            {new Set(users.filter(u => u.Role === 'accounting').map(u => u.UserID)).size}
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">Accounting</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-3 text-center">
          <div className="text-[20px] font-bold text-purple-600">
            {new Set(users.filter(u => u.Role === 'driver').map(u => u.UserID)).size}
          </div>
          <div className="text-[11px] text-on-surface-variant mt-1">Drivers</div>
        </div>
      </div>

      {/* Users List */}
      {isLoading && users.length === 0 ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden" role="status">
          <span className="sr-only">Loading...</span>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" aria-label="Active users loading">
              <thead className="bg-surface-container">
                <tr>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Status</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">User</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Role</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Last Seen</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Session</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 sm:px-4 py-3"><div className="flex gap-2"><Skeleton className="w-2.5 h-2.5 rounded-full" /><Skeleton className="w-4 h-4 rounded" /></div></td>
                    <td className="px-3 sm:px-4 py-3"><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></td>
                    <td className="px-3 sm:px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-3 sm:px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-3 sm:px-4 py-3"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-3 sm:px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-[13px]">No active users found</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" aria-label="Active users">
              <thead className="bg-surface-container">
                <tr>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Status</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">User</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Role</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Last Seen</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Session</th>
                  <th scope="col" className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.map(user => (
                  <ActiveUserRow
                    key={user.SessionID}
                    user={user}
                    getTimeSince={getTimeSince}
                    getRoleBadge={getRoleBadge}
                    isRecent={isRecent}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
