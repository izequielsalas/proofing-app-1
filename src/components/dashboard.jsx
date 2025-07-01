// src/components/dashboard.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ProofGrid from './proofGrid';
import UploadProof from './uploadProof';
import { Search, Filter, Upload, Users, LogOut } from 'lucide-react';

export default function Dashboard() {
  const [proofs, setProofs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });
  
  const { currentUser, userProfile, isAdmin, isClient, isDesigner, hasPermission } = useAuth();

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    // Build query based on user role
    let q;
    if (isAdmin()) {
      // Admins see all proofs
      q = query(collection(db, 'proofs'));
    } else if (isClient()) {
      // Clients see only proofs assigned to them
      q = query(
        collection(db, 'proofs'),
        where('assignedTo', 'array-contains', userProfile.uid)
      );
    } else if (isDesigner()) {
      // Designers see proofs assigned to them or uploaded by them
      q = query(collection(db, 'proofs'));
    } else {
      // Default fallback
      q = query(collection(db, 'proofs'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Additional filtering for designers and clients
      const filteredData = isClient() 
        ? data.filter(proof => 
            proof.assignedTo?.includes(userProfile.uid) || 
            proof.clientId === userProfile.uid
          )
        : isDesigner()
        ? data.filter(proof => 
            proof.assignedTo?.includes(userProfile.uid) || 
            proof.uploadedBy === userProfile.uid
          )
        : data;
      
      setProofs(filteredData);
      
      // Calculate stats
      const newStats = filteredData.reduce((acc, proof) => {
        acc.total++;
        acc[proof.status] = (acc[proof.status] || 0) + 1;
        return acc;
      }, { pending: 0, approved: 0, declined: 0, total: 0 });
      setStats(newStats);
    });
    
    return unsub;
  }, [currentUser, userProfile, isAdmin, isClient, isDesigner]);

  // Filter proofs based on status and search term
  const filteredProofs = proofs.filter(proof => {
    const matchesFilter = filter === 'all' || proof.status === filter;
    const matchesSearch = searchTerm === '' || 
      proof.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proof.title && proof.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (proof.clientName && proof.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleDisplayName = () => {
    switch (userProfile?.role) {
      case 'admin': return 'Administrator';
      case 'designer': return 'Designer';
      case 'client': return 'Client';
      default: return 'User';
    }
  };

  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cesar Graphics</h1>
              <p className="text-sm text-gray-600">
                {getRoleDisplayName()} Dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Admin Navigation */}
              {isAdmin() && (
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Users size={16} />
                  Manage Users
                </Link>
              )}
              
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {userProfile.displayName || userProfile.name || currentUser.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {userProfile.role}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {isAdmin() ? 'Total Proofs' : 'Your Proofs'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <div className="w-4 h-4 bg-amber-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Declined</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.declined}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search proofs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            {/* Upload Button - Only for admins and designers, hidden when dropdown is open */}
            {hasPermission('canUploadProofs') && !showUpload && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                <Upload size={16} />
                Upload Proof
              </button>
            )}
          </div>

          {/* Upload Component */}
          {showUpload && hasPermission('canUploadProofs') && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <UploadProof onUploadComplete={() => setShowUpload(false)} />
            </div>
          )}
        </div>

        {/* Role-specific messages */}
        {isClient() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Client View:</strong> You can only see proofs assigned to you.
              Click on any proof to approve, decline, or add comments.
            </p>
          </div>
        )}

        {isDesigner() && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-purple-800 text-sm">
              <strong>Designer View:</strong> You can see proofs assigned to you and upload new proofs for client approval.
            </p>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredProofs.length} of {stats.total} proofs
            {filter !== 'all' && ` (filtered by ${filter})`}
            {searchTerm && ` (searched for "${searchTerm}")`}
          </p>
        </div>

        {/* Proof Grid */}
        <ProofGrid proofs={filteredProofs} />
      </div>
    </div>
  );
}