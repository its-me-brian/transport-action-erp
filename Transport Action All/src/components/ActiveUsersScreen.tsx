import React, { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, Clock, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { gasPost } from '../services/api';

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Active Users</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time presence tracking via heartbeat
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-on-surface">
            {new Set(users.map(u => u.UserID)).size}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Unique Users</div>
          {users.length > new Set(users.map(u => u.UserID)).size && (
            <div className="text-[10px] text-on-surface-variant mt-0.5">{users.length} sessions</div>
          )}
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {new Set(users.filter(u => u.Role === 'coordinator').map(u => u.UserID)).size}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Coordinators</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {new Set(users.filter(u => u.Role === 'accounting').map(u => u.UserID)).size}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Accounting</div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(users.filter(u => u.Role === 'driver').map(u => u.UserID)).size}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Drivers</div>
        </div>
      </div>

      {/* Users List */}
      {isLoading && users.length === 0 ? (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">User</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Role</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Last Seen</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Session</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="flex gap-2"><div className="w-2.5 h-2.5 rounded-full bg-surface-dim" /><div className="w-4 h-4 bg-surface-dim rounded" /></div></td>
                  <td className="px-4 py-3"><div className="space-y-1"><div className="h-4 w-32 bg-surface-dim rounded" /><div className="h-3 w-20 bg-surface-dim rounded" /></div></td>
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-surface-dim rounded-full" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-12 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-3 w-24 bg-surface-dim rounded" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 bg-surface-dim rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active users found</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">User</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Role</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Last Seen</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">Session</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-on-surface">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map(user => (
                <tr key={user.SessionID} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isRecent(user.LastSeen) ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <Wifi className={`w-4 h-4 ${isRecent(user.LastSeen) ? 'text-green-500' : 'text-yellow-500'}`} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{user.Email}</div>
                      <div className="text-xs text-on-surface-variant">{user.UserID}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(user.Role)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                      {getTimeSince(user.LastSeen)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">
                    {user.SessionID?.substring(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">
                    {user.IPAddress || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
