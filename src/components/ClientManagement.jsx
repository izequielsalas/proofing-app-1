// src/components/ClientManagement.jsx - UPDATED: Reads from users + invitations collections

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sendInvitationEmail } from '../utils/emailService';

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, invited, inactive
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  // ⭐ UPDATED: Fetch from BOTH users and invitations collections
  const fetchClients = async () => {
    try {
      // Active clients from users collection
      const usersQ = query(collection(db, 'users'), where('role', '==', 'client'));
      const usersSnap = await getDocs(usersQ);
      const activeClients = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Pending invitations from invitations collection
      const invQ = query(
        collection(db, 'invitations'),
        where('status', '==', 'pending')
      );
      const invSnap = await getDocs(invQ);
      const pendingInvites = invSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        status: 'invited',  // Normalize for display/filtering
        _isInvitation: true
      }));

      // Combine, deduplicating by email
      const combined = [...activeClients];
      pendingInvites.forEach(inv => {
        if (!activeClients.find(c => c.email?.toLowerCase() === inv.email?.toLowerCase())) {
          combined.push(inv);
        }
      });

      // Sort by status then name
      combined.sort((a, b) => {
        if (a.status !== b.status) {
          const statusOrder = { active: 0, invited: 1, inactive: 2 };
          return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        }
        return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
      });

      setClients(combined);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (client) => {
    try {
      await sendInvitationEmail(client.email, client.displayName, 'admin');
      alert(`Invitation resent to ${client.displayName}`);
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Failed to resend invitation');
    }
  };

  const handleToggleStatus = async (client) => {
    // Don't toggle invitations — they're in a different collection
    if (client._isInvitation) {
      alert('This client has not activated their account yet. You can resend the invitation.');
      return;
    }

    try {
      const newStatus = client.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', client.id), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      setClients(prev => prev.map(c => 
        c.id === client.id ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      console.error('Error updating client status:', error);
      alert('Failed to update client status');
    }
  };

  const handleDeleteClient = async (client) => {
    if (!confirm(`Are you sure you want to delete ${client.displayName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from the correct collection
      if (client._isInvitation) {
        await deleteDoc(doc(db, 'invitations', client.id));
      } else {
        await deleteDoc(doc(db, 'users', client.id));
      }
      setClients(prev => prev.filter(c => c.id !== client.id));
      alert('Client deleted successfully');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesFilter = filter === 'all' || client.status === filter;
    const matchesSearch = !searchTerm || 
      (client.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-[#E6F9DD] text-[#2D7A0F]',
      invited: 'bg-[#FEF3CD] text-[#92690B]',
      inactive: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
        {status || 'unknown'}
      </span>
    );
  };

  const getStatsCard = (status, label, color) => {
    const count = clients.filter(c => c.status === status).length;
    return (
      <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${color}`}>
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{count}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cesar-navy"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <p className="text-sm text-gray-600">Manage client accounts and invitations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {getStatsCard('active', 'Active Clients', 'border-cesar-green')}
        {getStatsCard('invited', 'Pending Invitations', 'border-cesar-yellow')}
        {getStatsCard('inactive', 'Inactive Clients', 'border-cesar-gray')}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-cesar-navy">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
            />
          </div>
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
            >
              <option value="all">All Clients</option>
              <option value="active">Active Only</option>
              <option value="invited">Pending Invitations</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-white shadow rounded-lg">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No clients found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.displayName || 'No name provided'}
                        </div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        {client._isInvitation && (
                          <div className="text-xs text-cesar-navy mt-0.5">📨 Pending invitation</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.invitedAt 
                        ? (client.invitedAt.seconds 
                            ? new Date(client.invitedAt.seconds * 1000).toLocaleDateString()
                            : new Date(client.invitedAt).toLocaleDateString())
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.activatedAt 
                        ? (client.activatedAt.seconds
                            ? new Date(client.activatedAt.seconds * 1000).toLocaleDateString()
                            : new Date(client.activatedAt).toLocaleDateString())
                        : client.status === 'invited' ? 'Not yet activated' : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {(client.status === 'invited' || client._isInvitation) && (
                          <button
                            onClick={() => handleResendInvitation(client)}
                            className="text-cesar-navy hover:text-[#003d73] text-sm"
                            title="Resend invitation"
                          >
                            Resend
                          </button>
                        )}
                        
                        {!client._isInvitation && client.status !== 'invited' && (
                          <button
                            onClick={() => handleToggleStatus(client)}
                            className={`text-sm ${
                              client.status === 'active' 
                                ? 'text-[#92690B] hover:text-[#6d4e08]' 
                                : 'text-[#2D7A0F] hover:text-[#1e5a0a]'
                            }`}
                            title={client.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {client.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="text-cesar-magenta hover:text-[#c9006a] text-sm"
                          title="Delete client"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#E0EAF5] border border-cesar-navy/20 rounded-lg p-4">
        <h3 className="text-sm font-medium text-cesar-navy mb-2">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={fetchClients}
            className="px-3 py-1 bg-cesar-navy text-white text-sm rounded hover:bg-[#003d73]"
          >
            Refresh List
          </button>
          <button 
            onClick={() => setFilter('invited')}
            className="px-3 py-1 bg-cesar-yellow text-[#92690B] text-sm rounded hover:bg-[#e5a611]"
          >
            View Pending Invitations
          </button>
          <button 
            onClick={() => setSearchTerm('')}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Clear Search
          </button>
        </div>
      </div>
    </div>
  );
}