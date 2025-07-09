// 6. Enhanced Client Management Component
// src/components/ClientManagement.jsx

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

  const fetchClients = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const snapshot = await getDocs(q);
      const clientList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by status and then by name
      clientList.sort((a, b) => {
        if (a.status !== b.status) {
          const statusOrder = { active: 0, invited: 1, inactive: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return (a.displayName || a.email).localeCompare(b.displayName || b.email);
      });
      
      setClients(clientList);
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
      await deleteDoc(doc(db, 'users', client.id));
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
      active: 'bg-green-100 text-green-800',
      invited: 'bg-yellow-100 text-yellow-800',
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
        {getStatsCard('active', 'Active Clients', 'border-green-500')}
        {getStatsCard('invited', 'Pending Invitations', 'border-yellow-500')}
        {getStatsCard('inactive', 'Inactive Clients', 'border-gray-500')}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.invitedAt ? new Date(client.invitedAt.seconds * 1000).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.activatedAt ? new Date(client.activatedAt.seconds * 1000).toLocaleDateString() : 
                       client.status === 'invited' ? 'Not yet activated' : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {client.status === 'invited' && (
                          <button
                            onClick={() => handleResendInvitation(client)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                            title="Resend invitation"
                          >
                            Resend
                          </button>
                        )}
                        
                        {client.status !== 'invited' && (
                          <button
                            onClick={() => handleToggleStatus(client)}
                            className={`text-sm ${
                              client.status === 'active' 
                                ? 'text-yellow-600 hover:text-yellow-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={client.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {client.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteClient(client)}
                          className="text-red-600 hover:text-red-900 text-sm"
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

      {/* Bulk Actions (Future Enhancement) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={fetchClients}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Refresh List
          </button>
          <button 
            onClick={() => setFilter('invited')}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
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

// 7. Router Setup (App.jsx updates)
/*
Add this route to your router:

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AcceptInvitation from './components/AcceptInvitation';

function App() {
  return (
    <Router>
      <Routes>
        // ... your existing routes
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        // ... other routes
      </Routes>
    </Router>
  );
}
*/