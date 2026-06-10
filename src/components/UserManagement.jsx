// src/components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Shield, Edit2, Save, X, UserCheck, UserX,
  ArrowLeft, Trash2, AlertTriangle, UserPlus, RefreshCw,
  Eye, EyeOff, Copy, CheckCircle
} from 'lucide-react';

const ROLE_PERMISSIONS = {
  admin: {
    canViewAllProofs: true,
    canUploadProofs: true,
    canApproveProofs: true,
    canManageUsers: true
  },
  designer: {
    canViewAllProofs: false,
    canUploadProofs: true,
    canApproveProofs: false,
    canManageUsers: false
  },
  production: {
    canViewAllProofs: false,
    canUploadProofs: false,
    canApproveProofs: false,
    canManageUsers: false
  },
  client: {
    canViewAllProofs: false,
    canUploadProofs: false,
    canApproveProofs: true,
    canManageUsers: false
  }
};

const ROLE_COLORS = {
  admin: 'bg-[#EDE7F6] text-[#5A3695]',
  designer: 'bg-[#E0EAF5] text-cesar-navy',
  production: 'bg-[#FFF3E0] text-[#E65100]',
  client: 'bg-[#E6F9DD] text-[#2D7A0F]',
};

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [tempRole, setTempRole] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Create staff modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'designer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(null); // { displayName, email, role }
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [togglingUser, setTogglingUser] = useState(null);

  const { isAdmin, userProfile } = useAuth();

  useEffect(() => {
    if (!isAdmin()) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort: admins first, then designers, then others
      list.sort((a, b) => {
        const order = { admin: 0, designer: 1, production: 2, client: 3 };
        return (order[a.role] ?? 4) - (order[b.role] ?? 4);
      });
      setUsers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // ── Role editing ──────────────────────────────────────────────
  const startEditRole = (user) => {
    setEditingUser(user.id);
    setTempRole(user.role);
  };

  const saveRole = async (userId) => {
    setSavingRole(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: tempRole,
        permissions: ROLE_PERMISSIONS[tempRole] || ROLE_PERMISSIONS.client,
        updatedAt: new Date()
      });
      setEditingUser(null);
      setTempRole('');
    } catch (err) {
      console.error('Role update error:', err);
      alert('Failed to update role. Please try again.');
    } finally {
      setSavingRole(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setTempRole('');
  };

  // ── Toggle active/inactive ─────────────────────────────────────
  const toggleUserStatus = async (user) => {
    if (user.id === userProfile?.uid) return; // Can't deactivate yourself
    setTogglingUser(user.id);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        isActive: !user.isActive,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Status toggle error:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setTogglingUser(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const openDeleteModal = (user) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeletingUser(null);
    setShowDeleteModal(false);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await deleteDoc(doc(db, 'users', deletingUser.id));
      closeDeleteModal();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete user.');
    }
  };

  const canDeleteUser = (user) => {
    if (user.id === userProfile?.uid) return false;
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount <= 1) return false;
    return true;
  };

  // ── Create staff account ──────────────────────────────────────
  const openCreateModal = () => {
    setCreateForm({ displayName: '', email: '', password: generatePassword(), role: 'designer' });
    setCreateError('');
    setCreateSuccess(null);
    setShowCreateModal(true);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(createForm.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCreateStaff = async () => {
    const { displayName, email, password, role } = createForm;
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setCreateError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const functions = getFunctions();
      const createStaffUser = httpsCallable(functions, 'createStaffUser');
      await createStaffUser({ displayName: displayName.trim(), email: email.trim(), password, role });

      setCreateSuccess({ displayName: displayName.trim(), email: email.trim(), role, password });
    } catch (err) {
      console.error('Create staff error:', err);
      setCreateError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateSuccess(null);
    setCreateError('');
  };

  // ── Helpers ───────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Unknown'; }
  };

  // ── Guard ─────────────────────────────────────────────────────
  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-cesar-magenta mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cesar-navy"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  const staffUsers = users.filter(u => u.role !== 'client');
  const clientUsers = users.filter(u => u.role === 'client');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cesar-navy" />
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors"
            >
              <UserPlus size={16} />
              Add Staff Account
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Total Users', value: users.length, color: 'bg-gray-50 text-gray-900' },
            { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'bg-[#EDE7F6] text-[#5A3695]' },
            { label: 'Designers', value: users.filter(u => u.role === 'designer').length, color: 'bg-[#E0EAF5] text-cesar-navy' },
            { label: 'Clients', value: users.filter(u => u.role === 'client').length, color: 'bg-[#E6F9DD] text-[#2D7A0F]' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-4 ${s.color.split(' ')[0]}`}>
              <div className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</div>
              <div className="text-sm text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Internal Staff</h2>
          <p className="text-sm text-gray-500">Admins, designers, and production team</p>
        </div>
        <UserTable
          users={staffUsers}
          editingUser={editingUser}
          tempRole={tempRole}
          setTempRole={setTempRole}
          savingRole={savingRole}
          togglingUser={togglingUser}
          currentUserId={userProfile?.uid}
          onEditRole={startEditRole}
          onSaveRole={saveRole}
          onCancelEdit={cancelEdit}
          onToggleStatus={toggleUserStatus}
          onDelete={openDeleteModal}
          canDeleteUser={canDeleteUser}
          formatDate={formatDate}
          showClientCol={false}
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          <p className="text-sm text-gray-500">Client portal users — invited via proof upload flow</p>
        </div>
        <UserTable
          users={clientUsers}
          editingUser={editingUser}
          tempRole={tempRole}
          setTempRole={setTempRole}
          savingRole={savingRole}
          togglingUser={togglingUser}
          currentUserId={userProfile?.uid}
          onEditRole={startEditRole}
          onSaveRole={saveRole}
          onCancelEdit={cancelEdit}
          onToggleStatus={toggleUserStatus}
          onDelete={openDeleteModal}
          canDeleteUser={canDeleteUser}
          formatDate={formatDate}
          showClientCol={true}
        />
      </div>

      {/* Role Descriptions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Descriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { role: 'Admin', color: 'border-[#5A3695]/30', titleColor: 'text-[#5A3695]', items: ['Full system access', 'View all proofs', 'Upload & manage proofs', 'Manage users', 'Approve / decline'] },
            { role: 'Designer', color: 'border-cesar-navy/30', titleColor: 'text-cesar-navy', items: ['Upload proofs', 'Assign to clients', 'View own uploads', 'No approval rights', 'No user management'] },
            { role: 'Production', color: 'border-[#E65100]/30', titleColor: 'text-[#E65100]', items: ['View approved proofs', 'Update production status', 'Read-only access', 'No upload rights', 'No client visibility'] },
            { role: 'Client', color: 'border-[#2D7A0F]/30', titleColor: 'text-[#2D7A0F]', items: ['View own proofs only', 'Approve / decline', 'Add comments', 'Download approved files', 'No upload rights'] },
          ].map(({ role, color, titleColor, items }) => (
            <div key={role} className={`border ${color} rounded-lg p-4`}>
              <h4 className={`font-medium ${titleColor} mb-2`}>{role}</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {items.map(i => <li key={i}>• {i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete <strong>{deletingUser.displayName}</strong> ({deletingUser.email})?
                  This only removes their Firestore profile — their Firebase Auth account will remain.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Any proofs assigned to this user will need to be reassigned.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteModal} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cesar-navy" />
                <h3 className="text-lg font-semibold text-gray-900">Add Staff Account</h3>
              </div>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {createSuccess ? (
              /* Success state */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle size={20} />
                  <span className="font-medium">Account created successfully!</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {createSuccess.displayName}</p>
                  <p><span className="font-medium">Email:</span> {createSuccess.email}</p>
                  <p><span className="font-medium">Role:</span> <span className="capitalize">{createSuccess.role}</span></p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-800 font-medium mb-2">⚠️ Share this password with the new staff member — it won't be shown again:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-white border border-yellow-300 rounded px-2 py-1">{createSuccess.password}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createSuccess.password); setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000); }}
                      className="p-1.5 text-yellow-700 hover:bg-yellow-100 rounded transition-colors"
                    >
                      {copiedPassword ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">They can change their password from their profile settings after logging in.</p>
                <button onClick={closeCreateModal} className="w-full px-4 py-2 bg-cesar-navy text-white rounded-lg hover:bg-[#003070] transition-colors">
                  Done
                </button>
              </div>
            ) : (
              /* Create form */
              <div className="space-y-4">
                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy text-sm"
                    placeholder="e.g. Maria Lopez"
                    value={createForm.displayName}
                    onChange={e => setCreateForm(f => ({ ...f, displayName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy text-sm"
                    placeholder="maria@cesargraphics.com"
                    value={createForm.email}
                    onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy text-sm"
                    value={createForm.role}
                    onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="designer">Designer</option>
                    <option value="production">Production</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                    <button
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, password: generatePassword() }))}
                      className="text-xs text-cesar-navy hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={11} />
                      Generate new
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy text-sm font-mono"
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="p-2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button type="button" onClick={copyPassword} className="p-2 text-gray-400 hover:text-gray-600">
                      {copiedPassword ? <CheckCircle size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Share this with the staff member so they can log in.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={closeCreateModal} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateStaff}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Creating...
                      </>
                    ) : 'Create Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: User Table ──────────────────────────────────────────────────
function UserTable({
  users, editingUser, tempRole, setTempRole, savingRole, togglingUser,
  currentUserId, onEditRole, onSaveRole, onCancelEdit, onToggleStatus,
  onDelete, canDeleteUser, formatDate
}) {
  if (users.length === 0) {
    return <div className="px-6 py-8 text-center text-gray-500 text-sm">No users in this group.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {users.map(user => {
            const isEditing = editingUser === user.id;
            const isCurrentUser = user.id === currentUserId;
            const isToggling = togglingUser === user.id;
            const inactive = user.isActive === false;

            return (
              <tr key={user.id} className={inactive ? 'bg-gray-50 opacity-70' : ''}>
                {/* User info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cesar-navy/10 flex items-center justify-center text-cesar-navy font-semibold text-sm">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm flex items-center gap-1">
                        {user.displayName || '(no name)'}
                        {isCurrentUser && <span className="text-xs text-gray-400">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>

                {/* Role — editable */}
                <td className="px-6 py-4">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={tempRole}
                        onChange={e => setTempRole(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                      >
                        <option value="admin">Admin</option>
                        <option value="designer">Designer</option>
                        <option value="production">Production</option>
                        <option value="client">Client</option>
                      </select>
                      <button
                        onClick={() => onSaveRole(user.id)}
                        disabled={savingRole}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Save"
                      >
                        <Save size={16} />
                      </button>
                      <button onClick={onCancelEdit} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {user.role || 'unknown'}
                      </span>
                      {!isCurrentUser && (
                        <button
                          onClick={() => onEditRole(user)}
                          className="p-1 text-gray-400 hover:text-cesar-navy transition-colors"
                          title="Change role"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </td>

                {/* Active/Inactive */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {inactive ? 'Inactive' : 'Active'}
                  </span>
                </td>

                {/* Date */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(user.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    {/* Toggle active */}
                    {!isCurrentUser && (
                      <button
                        onClick={() => onToggleStatus(user)}
                        disabled={isToggling}
                        className={`p-1.5 rounded transition-colors ${inactive ? 'text-green-600 hover:bg-green-50' : 'text-yellow-600 hover:bg-yellow-50'} disabled:opacity-40`}
                        title={inactive ? 'Activate user' : 'Deactivate user'}
                      >
                        {isToggling
                          ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          : inactive ? <UserCheck size={16} /> : <UserX size={16} />
                        }
                      </button>
                    )}

                    {/* Delete */}
                    {canDeleteUser(user) && (
                      <button
                        onClick={() => onDelete(user)}
                        className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}