import React from 'react';
import { Users, UserCheck, UserX, Shield, Trash2, Plus, Loader2, X } from 'lucide-react';

interface UserManagementSectionProps {
  users: any[];
  isLoadingUsers: boolean;
  userAction: string | null;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onToggleRole: (userId: string, currentRole: string) => void;
  onDeleteUser: (userId: string) => void;
  onCreateUser: () => void;
  // Create modal
  showCreateUser: boolean;
  onShowCreateUserChange: (v: boolean) => void;
  newUser: { username: string; email: string; password: string; name: string; role: string };
  onNewUserChange: (user: { username: string; email: string; password: string; name: string; role: string }) => void;
  isCreatingUser: boolean;
  // Edit modal
  editingUser: any;
  onEditingUserChange: (user: any) => void;
  editUserData: { name: string; email: string; role: string };
  onEditUserDataChange: (data: { name: string; email: string; role: string }) => void;
  onEditUser: () => void;
  isEditingUser: boolean;
}

export default function UserManagementSection({
  users,
  isLoadingUsers,
  userAction,
  onApproveUser,
  onRejectUser,
  onToggleRole,
  onDeleteUser,
  onCreateUser,
  showCreateUser,
  onShowCreateUserChange,
  newUser,
  onNewUserChange,
  isCreatingUser,
  editingUser,
  onEditingUserChange,
  editUserData,
  onEditUserDataChange,
  onEditUser,
  isEditingUser
}: UserManagementSectionProps) {
  return (
    <>
      <section id="users-section" className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-[14px] font-semibold text-on-surface">User Management</h3>
          </div>
          <button
            onClick={() => onShowCreateUserChange(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-[12px] font-medium hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create User
          </button>
        </div>

        {isLoadingUsers ? (
          <div className="flex items-center justify-center p-8 text-on-surface-variant text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-[13px]">
            No users found
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-surface-dim">
                  <tr className="border-b border-outline-variant">
                    <th className="text-left px-4 py-2.5 font-medium text-on-surface-variant">Username</th>
                    <th className="text-left px-4 py-2.5 font-medium text-on-surface-variant">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-on-surface-variant">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium text-on-surface-variant">Role</th>
                    <th className="text-left px-4 py-2.5 font-medium text-on-surface-variant">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-outline-variant/50 hover:bg-surface-dim/30">
                      <td className="px-4 py-2 font-medium text-on-surface">{u.username}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{u.name || '-'}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          u.role === 'admin' ? 'bg-red-50 text-red-700' :
                          u.role === 'coordinator' ? 'bg-blue-50 text-blue-700' :
                          u.role === 'accounting' ? 'bg-green-50 text-green-700' :
                          u.role === 'driver' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                          {u.role === 'coordinator' && <UserCheck className="w-2.5 h-2.5" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          u.status === 'active' ? 'bg-green-50 text-green-700' :
                          u.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {u.status === 'active' && <UserCheck className="w-2.5 h-2.5" />}
                          {u.status === 'pending' && <UserX className="w-2.5 h-2.5" />}
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {userAction === u.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-on-surface-variant" />
                          ) : (
                            <>
                              {u.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => onApproveUser(u.id)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                                    title="Approve"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onRejectUser(u.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                    title="Reject"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  onEditingUserChange(u);
                                  onEditUserDataChange({ name: u.name || '', email: u.email, role: u.role });
                                }}
                                className="p-1 text-on-surface-variant hover:bg-surface-container rounded cursor-pointer"
                                title="Edit"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteUser(u.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[14px] font-semibold text-on-surface">Create New User</h3>
              <button onClick={() => onShowCreateUserChange(false)}>
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => onNewUserChange({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => onNewUserChange({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => onNewUserChange({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => onNewUserChange({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => onNewUserChange({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="accounting">Accounting</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant shrink-0">
              <button
                onClick={() => onShowCreateUserChange(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={onCreateUser}
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
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
              <h3 className="text-[14px] font-semibold text-on-surface">Edit User: {editingUser.username}</h3>
              <button onClick={() => onEditingUserChange(null)}>
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Full Name</label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => onEditUserDataChange({ ...editUserData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Email</label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => onEditUserDataChange({ ...editUserData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Role</label>
                <select
                  value={editUserData.role}
                  onChange={(e) => onEditUserDataChange({ ...editUserData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="accounting">Accounting</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant shrink-0">
              <button
                onClick={() => onEditingUserChange(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[12px] hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={onEditUser}
                disabled={isEditingUser}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isEditingUser ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
