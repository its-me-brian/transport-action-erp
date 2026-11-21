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
  Search,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ScreenId } from '../types';
import { getUsers, approveUser, rejectUser, updateUserRole, deleteUser, createUser, updateUser, resetPassword, changePassword, UserRecord } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from './ui/Skeleton';

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
  onResetPassword: (u: UserRecord) => void;
}

const UserRow = React.memo(function UserRow({ u, currentUserId, userAction, safeDate, handleApproveUser, handleRejectUser, handleToggleRole, handleDeleteUser, setEditingUser, setEditUserData, onResetPassword }: UserRowProps) {
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
            USER_ROLES.indexOf(u.role) === -1 ? 'bg-amber-50 text-amber-700' :
            'bg-gray-100 text-gray-700'
          }`}
          title={USER_ROLES.indexOf(u.role) === -1 ? 'No role assigned — click to assign' : 'Click to cycle role'}
        >
          {u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
          {USER_ROLES.indexOf(u.role) === -1 ? 'no role' : u.role}
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
                aria-label="Approve"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleRejectUser(u.id)}
                disabled={userAction === u.id}
                className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50 transition-colors"
                title="Reject"
                aria-label="Reject"
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
            aria-label="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onResetPassword(u)}
            disabled={userAction === u.id}
            className="p-1.5 rounded hover:bg-amber-50 text-amber-600 disabled:opacity-50 transition-colors"
            title="Reset password"
            aria-label={`Reset password for ${u.username}`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteUser(u.id)}
            disabled={userAction === u.id || u.id === currentUserId}
            className="p-1.5 rounded hover:bg-red-50 text-red-500 disabled:opacity-30 transition-colors"
            title="Delete"
            aria-label="Delete"
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

/** Roles that actually grant permissions (mirrors VALID_ROLES in auth.gs). */
const USER_ROLES = ['admin', 'coordinator', 'accounting', 'driver'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  accounting: 'Accounting',
  driver: 'Driver',
};

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

  // Reset password modal (admin action on another account)
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [resetData, setResetData] = useState({ password: '', confirm: '' });
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Approve user modal — the role is assigned in the same operation, because
  // approving without one leaves the account authenticated but powerless.
  const [approveTarget, setApproveTarget] = useState<UserRecord | null>(null);
  const [approveRole, setApproveRole] = useState('coordinator');
  const [approveError, setApproveError] = useState<string | null>(null);

  // Change own password modal
  const [showOwnPassword, setShowOwnPassword] = useState(false);
  const [ownPasswordData, setOwnPasswordData] = useState({ current: '', password: '', confirm: '' });
  const [ownPasswordError, setOwnPasswordError] = useState<string | null>(null);
  const [isChangingOwn, setIsChangingOwn] = useState(false);

  // Shared password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Success / warning notice banner
  const [notice, setNotice] = useState<string | null>(null);

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
  const handleApproveUser = (userId: string) => {
    const target = users.find(u => u.id === userId) || null;
    setApproveTarget(target);
    setApproveRole(target && USER_ROLES.indexOf(target.role) !== -1 ? target.role : 'coordinator');
    setApproveError(null);
  };

  const confirmApproveUser = async () => {
    if (!token || !approveTarget) return;
    setUserAction(approveTarget.id);
    setApproveError(null);
    try {
      const result = await approveUser(token, approveTarget.id, approveRole);
      if (result?.error) {
        setApproveError(result.error);
        return;
      }
      setNotice(`${approveTarget.username} aprobado con rol ${ROLE_LABELS[approveRole] || approveRole}.`);
      setApproveTarget(null);
      await loadUsers();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'No se pudo aprobar el usuario.');
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
      // A role that is not in the matrix (e.g. the registration sentinel
      // 'pending') cycles from -1 to index 0, which used to escalate the
      // account straight to admin. Start such accounts at the least
      // privileged role instead.
      const idx = USER_ROLES.indexOf(currentRole);
      const newRole = idx === -1 ? 'driver' : USER_ROLES[(idx + 1) % USER_ROLES.length];
      const result = await updateUserRole(token, userId, newRole);
      if (result?.error) {
        setNotice(`No se pudo cambiar el rol: ${result.error}`);
      } else {
        setNotice(`Rol actualizado a ${ROLE_LABELS[newRole] || newRole}.`);
      }
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

  const openResetPassword = (u: UserRecord) => {
    setResetTarget(u);
    setResetData({ password: '', confirm: '' });
    setResetError(null);
    setShowPassword(false);
  };

  const handleResetPassword = async () => {
    if (!token || !resetTarget) return;
    if (resetData.password.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (resetData.password !== resetData.confirm) {
      setResetError('Las contraseñas no coinciden.');
      return;
    }
    setIsResetting(true);
    setResetError(null);
    try {
      const result = await resetPassword(token, resetTarget.id, resetData.password);
      if (result?.error) {
        setResetError(result.error);
        return;
      }
      const target = resetTarget;
      setResetTarget(null);
      setResetData({ password: '', confirm: '' });
      setNotice(
        result?.selfReset
          ? 'Tu contraseña fue actualizada.'
          : `Contraseña de ${target.username} actualizada. Sus sesiones abiertas fueron cerradas.`
      );
      await loadUsers();
    } catch (err: any) {
      setResetError(err?.message || 'No se pudo resetear la contraseña.');
    } finally {
      setIsResetting(false);
    }
  };

  const openOwnPassword = () => {
    setShowOwnPassword(true);
    setOwnPasswordData({ current: '', password: '', confirm: '' });
    setOwnPasswordError(null);
    setShowPassword(false);
  };

  const handleChangeOwnPassword = async () => {
    if (!token) return;
    if (!ownPasswordData.current) {
      setOwnPasswordError('Ingresá tu contraseña actual.');
      return;
    }
    if (ownPasswordData.password.length < 6) {
      setOwnPasswordError('La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }
    if (ownPasswordData.password !== ownPasswordData.confirm) {
      setOwnPasswordError('Las contraseñas no coinciden.');
      return;
    }
    setIsChangingOwn(true);
    setOwnPasswordError(null);
    try {
      const result = await changePassword(token, ownPasswordData.current, ownPasswordData.password);
      if (result?.error) {
        setOwnPasswordError(result.error);
        return;
      }
      setShowOwnPassword(false);
      setOwnPasswordData({ current: '', password: '', confirm: '' });
      setNotice('Tu contraseña fue actualizada. Usala en el próximo login.');
    } catch (err: any) {
      setOwnPasswordError(err?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setIsChangingOwn(false);
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            onClick={openOwnPassword}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-outline-variant bg-surface-container-lowest text-on-surface rounded-lg text-[12px] font-medium hover:bg-surface-container-low transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Change my password
          </button>
          <button
            onClick={() => setShowCreateUser(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-[12px] text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss notice" className="text-green-700 hover:text-green-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          <div className="p-4 space-y-0" role="status">
            <span className="sr-only">Loading...</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-outline-variant/50">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 w-28" />
                  </div>
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
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
                    onResetPassword={openResetPassword}
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
              <button onClick={() => setShowCreateUser(false)} aria-label="Close">
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
                  aria-label="Username"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  aria-label="Email"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  aria-label="Full Name"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  aria-label="Password"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  aria-label="Select user role"
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
              <button onClick={() => setEditingUser(null)} aria-label="Close">
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
                  aria-label="Full Name"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email</label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  aria-label="Email"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                  aria-label="Select user role"
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
      {/* Approve User Modal — role assigned at approval time */}
      {approveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-on-surface">Approve user</h3>
                <p className="text-[11px] text-on-surface-variant truncate">{approveTarget.username} · {approveTarget.email}</p>
              </div>
              <button onClick={() => setApproveTarget(null)} aria-label="Close">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <p className="text-[11px] text-on-surface-variant">
                Elegí el rol con el que va a operar. Sin rol el usuario puede iniciar sesión pero no puede acceder a ninguna pantalla.
              </p>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role *</label>
                <select
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value)}
                  aria-label="Select role to assign"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {USER_ROLES.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
              {approveError && (
                <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{approveError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveUser}
                disabled={userAction === approveTarget.id}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {userAction === approveTarget.id ? 'Approving...' : `Approve as ${ROLE_LABELS[approveRole]}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Modal (admin → otro usuario) */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-on-surface">Reset password</h3>
                <p className="text-[11px] text-on-surface-variant truncate">{resetTarget.username} · {resetTarget.email}</p>
              </div>
              <button onClick={() => setResetTarget(null)} aria-label="Close">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <p className="text-[11px] text-on-surface-variant">
                No hace falta la contraseña actual. Si el usuario no sos vos, se cierran sus sesiones abiertas.
              </p>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">New password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={resetData.password}
                    onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                    aria-label="New password"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Confirm password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={resetData.confirm}
                  onChange={(e) => setResetData({ ...resetData, confirm: e.target.value })}
                  aria-label="Confirm password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {resetError && (
                <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isResetting || !resetData.password || !resetData.confirm}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Reset password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Own Password Modal */}
      {showOwnPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[14px] font-semibold text-on-surface">Change my password</h3>
              <button onClick={() => setShowOwnPassword(false)} aria-label="Close">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Current password *</label>
                <input
                  type="password"
                  value={ownPasswordData.current}
                  onChange={(e) => setOwnPasswordData({ ...ownPasswordData, current: e.target.value })}
                  aria-label="Current password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">New password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={ownPasswordData.password}
                    onChange={(e) => setOwnPasswordData({ ...ownPasswordData, password: e.target.value })}
                    aria-label="New password"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Confirm new password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={ownPasswordData.confirm}
                  onChange={(e) => setOwnPasswordData({ ...ownPasswordData, confirm: e.target.value })}
                  aria-label="Confirm new password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {ownPasswordError && (
                <div className="flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{ownPasswordError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant shrink-0">
              <button
                onClick={() => setShowOwnPassword(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeOwnPassword}
                disabled={isChangingOwn || !ownPasswordData.current || !ownPasswordData.password || !ownPasswordData.confirm}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isChangingOwn ? 'Saving...' : 'Change password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
