import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Trash2, 
  Plus, 
  Edit3, 
  Loader2, 
  X,
  Search
} from 'lucide-react';
import { ScreenId } from '../types';
import { getUsers, approveUser, rejectUser, updateUserRole, deleteUser, createUser, updateUser, UserRecord } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UserRowProps {
  u: UserRecord;
  currentUserId?: string;
  userAction: string | null;
  safeDate: (s: string) => string;
  handleApproveUser: (userId: string) => void;
  handleRejectUser: (userId: string) => void;
  handleToggleRole: (userId: string, currentRole: string) => void;
  handleDeleteUser: (userId: string) => void;
  setEditingUser: (user: UserRecord | null) => void;
  setEditUserData: (data: { name: string; email: string; role: string }) => void;
}

const UserRow = React.memo(function UserRow({ u, currentUserId, userAction, safeDate, handleApproveUser, handleRejectUser, handleToggleRole, handleDeleteUser, setEditingUser, setEditUserData }: UserRowProps) {
  return (
    <tr key={u.id} className="border-b border-outline-variant/50 hover:bg-surface-dim/50 transition-colors">
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
            {u.username?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-on-surface truncate">{u.username}</div>
            {u.name && <div className="text-[11px] text-on-surface-variant truncate">{u.name}</div>}
            <div className="text-[11px] text-on-surface-variant truncate sm:hidden">{u.email}</div>
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 text-on-surface-variant hidden sm:table-cell">{u.email}</td>
      <td className="px-3 sm:px-4 py-3">
        <button
          onClick={() => handleToggleRole(u.id, u.role)}
          disabled={userAction === u.id}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
            u.role === 'admin' ? 'bg-primary/10 text-primary' : 
            u.role === 'coordinator' ? 'bg-blue-50 text-blue-700' :
            u.role === 'accounting' ? 'bg-purple-50 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}
          title="Click to cycle role"
        >
          {u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
          {u.role}
        </button>
      </td>
      <td className="px-3 sm:px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
          u.status === 'approved' ? 'bg-green-50 text-green-700' :
          u.status === 'pending' ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-700'
        }`}>
          {u.status === 'approved' && <UserCheck className="w-2.5 h-2.5" />}
          {u.status === 'pending' && <Loader2 className="w-2.5 h-2.5" />}
          {u.status === 'rejected' && <UserX className="w-2.5 h-2.5" />}
          {u.status}
        </span>
      </td>
      <td className="px-3 sm:px-4 py-3 text-on-surface-variant text-[11px] hidden md:table-cell">
        {u.lastLogin ? safeDate(u.lastLogin) : 'Never'}
      </td>
      <td className="px-3 sm:px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {u.status === 'pending' && (
            <>
              <button
                onClick={() => handleApproveUser(u.id)}
                disabled={userAction === u.id}
                className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50 transition-colors"
                title="Approve"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleRejectUser(u.id)}
                disabled={userAction === u.id}
                className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50 transition-colors"
                title="Reject"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setEditingUser(u);
              setEditUserData({ name: u.name || '', email: u.email || '', role: u.role });
            }}
            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteUser(u.id)}
            disabled={userAction === u.id || u.id === currentUserId}
            className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

interface UserManagementScreenProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function UserManagementScreen({ onNavigate }: UserManagementScreenProps) {
  const { user, token, can } = useAuth();
  
  // Users state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userAction, setUserAction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', name: '', role: 'coordinator' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Edit user modal
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editUserData, setEditUserData] = useState({ name: '', email: '', role: 'coordinator' });
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Load users on mount
  useEffect(() => {
    if (can('userManagement')) {
      loadUsers();
    }
  }, [can, token]);

  const loadUsers = async () => {
    if (!token || !can('userManagement')) return;
    setIsLoading(true);
    try {
      const result = await getUsers(token);
      if (result.success && result.users) {
        setUsers(result.users);
      }
    } catch (err) {
      console.error('[UserManagement] load users error:', err);
    } finally {
      setIsLoading(false);
      setUserAction(null);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  // User management actions
  const handleApproveUser = async (userId: string) => {
    if (!token) return;
    setUserAction(userId);
    try {
      await approveUser(token, userId);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!token) return;
    setUserAction(userId);
    try {
      await rejectUser(token, userId);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (!token) return;
    setUserAction(userId);
    try {
      const roles = ['admin', 'coordinator', 'accounting', 'driver'];
      const idx = roles.indexOf(currentRole);
      const newRole = roles[(idx + 1) % roles.length];
      await updateUserRole(token, userId, newRole);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!token || !confirm('Are you sure you want to delete this user?')) return;
    setUserAction(userId);
    try {
      await deleteUser(token, userId);
      await loadUsers();
    } finally {
      setUserAction(null);
    }
  };

  const handleCreateUser = async () => {
    if (!token || !newUser.username || !newUser.email || !newUser.password) return;
    setIsCreatingUser(true);
    try {
      await createUser(token, newUser);
      setNewUser({ username: '', email: '', password: '', name: '', role: 'coordinator' });
      await loadUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
    } finally {
      setIsCreatingUser(false);
      setShowCreateUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!token || !editingUser) return;
    setIsEditingUser(true);
    try {
      await updateUser(token, editingUser.id, editUserData);
      await loadUsers();
    } catch (err) {
      console.error('Failed to edit user:', err);
    } finally {
      setIsEditingUser(false);
      setEditingUser(null);
    }
  };

  // Stats
  const stats = {
    total: users.length,
    approved: users.filter(u => u.status === 'approved').length,
    pending: users.filter(u => u.status === 'pending').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  };

  const safeDate = (s: string) => {
    if (!s) return '—';
    try { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); }
    catch { return '—'; }
  };

  if (!can('userManagement')) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-3">
        <Shield className="w-12 h-12 text-on-surface-variant opacity-30" />
        <p className="text-[14px] text-on-surface-variant">You need admin access to manage users.</p>
        <button
          onClick={() => onNavigate('transport')}
          className="text-[12px] text-primary hover:underline"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div id="user-management-screen" className="flex-1 w-full max-w-[1200px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">User Management</h1>
          <p className="text-[13px] text-on-surface-variant">Manage user accounts, roles, and permissions.</p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wide">Total</p>
          <p className="text-[20px] font-bold text-on-surface">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-[11px] text-green-700 uppercase tracking-wide">Approved</p>
          <p className="text-[20px] font-bold text-green-700">{stats.approved}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-[11px] text-amber-700 uppercase tracking-wide">Pending</p>
          <p className="text-[20px] font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <p className="text-[11px] text-red-700 uppercase tracking-wide">Rejected</p>
          <p className="text-[20px] font-bold text-red-700">{stats.rejected}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name, email, or role..."
          aria-label="Search users by name, email, or role"
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-[13px] text-on-surface focus:outline-none focus:border-primary"
        />
      </div>

      {/* Users Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-outline-variant/50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-surface-container-highest rounded w-20 animate-pulse" />
                    <div className="h-2.5 bg-surface-container-highest rounded w-28 animate-pulse" />
                  </div>
                </div>
                <div className="h-3 bg-surface-container-highest rounded w-16 animate-pulse" />
                <div className="h-3 bg-surface-container-highest rounded w-20 animate-pulse" />
                <div className="h-3 bg-surface-container-highest rounded w-16 animate-pulse" />
                <div className="h-3 bg-surface-container-highest rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-[13px]">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{searchQuery ? 'No users match your search.' : 'No users found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-dim">
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">User</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap hidden sm:table-cell">Email</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Role</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Status</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap hidden md:table-cell">Last Login</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-medium text-on-surface-variant whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    currentUserId={user?.id}
                    userAction={userAction}
                    safeDate={safeDate}
                    handleApproveUser={handleApproveUser}
                    handleRejectUser={handleRejectUser}
                    handleToggleRole={handleToggleRole}
                    handleDeleteUser={handleDeleteUser}
                    setEditingUser={setEditingUser}
                    setEditUserData={setEditUserData}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="text-[14px] font-semibold text-on-surface">Create New User</h3>
              <button onClick={() => setShowCreateUser(false)}>
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="accounting">Accounting</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant">
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUser.username || !newUser.email || !newUser.password || isCreatingUser}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h3 className="text-[14px] font-semibold text-on-surface">Edit User: {editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)}>
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email</label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="accounting">Accounting</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={isEditingUser}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isEditingUser ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
