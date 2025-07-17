// src/components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Shield, Edit2, Save, X, UserCheck, UserX, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [tempRole, setTempRole] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { isAdmin, userProfile } = useAuth();

  useEffect(() => {
    if (!isAdmin()) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const updateUserRole = async (userId, newRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      const permissions = {
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
        client: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        }
      };

      await updateDoc(userRef, {
        role: newRole,
        permissions: permissions[newRole],
        updatedAt: new Date()
      });
      
      setEditingUser(null);
      setTempRole('');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role. Please try again.');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status. Please try again.');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', deletingUser.id));
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setDeletingUser(null);
      
      // Show success message
      alert(`User ${deletingUser.displayName || deletingUser.email} has been successfully deleted.`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const openDeleteModal = (user) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingUser(null);
  };

  const handleEditStart = (user) => {
    setEditingUser(user.id);
    setTempRole(user.role);
  };

  const handleEditCancel = () => {
    setEditingUser(null);
    setTempRole('');
  };

  const handleEditSave = (userId) => {
    updateUserRole(userId, tempRole);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'designer': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const canDeleteUser = (user) => {
    // Prevent deleting yourself
    if (user.id === userProfile?.uid) return false;
    
    // Prevent deleting the last admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount <= 1) return false;
    
    return true;
  };

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage users.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
          
          {/* Back to Dashboard Button */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
        
        <p className="text-gray-600">
          Manage user roles and permissions for the proofing system.
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <div className="text-sm text-gray-600">Admins</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'designer').length}
            </div>
            <div className="text-sm text-gray-600">Designers</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'client').length}
            </div>
            <div className="text-sm text-gray-600">Clients</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || 'No name set'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select 
                        value={tempRole} 
                        onChange={(e) => setTempRole(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="designer">Designer</option>
                        <option value="client">Client</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {editingUser === user.id ? (
                        <>
                          <button
                            onClick={() => handleEditSave(user.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditStart(user)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                              user.isActive 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <UserX size={14} />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} />
                                Activate
                              </>
                            )}
                          </button>
                          {canDeleteUser(user) && (
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{deletingUser?.displayName || deletingUser?.email}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will permanently remove the user from the system. Any proofs assigned to this user will need to be reassigned.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Descriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-800 mb-2">Admin</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View all proofs</li>
              <li>• Upload proofs</li>
              <li>• Approve/decline proofs</li>
              <li>• Manage users</li>
              <li>• Full system access</li>
            </ul>
          </div>
          <div className="border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Designer</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Upload proofs</li>
              <li>• <strong>Assign proofs to clients</strong></li>
              <li>• View assigned proofs</li>
              <li>• Edit own uploads</li>
              <li>• No approval rights</li>
            </ul>
          </div>
          <div className="border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Client</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View own proofs only</li>
              <li>• Approve/decline proofs</li>
              <li>• Add comments</li>
              <li>• Download approved files</li>
              <li>• No upload rights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}