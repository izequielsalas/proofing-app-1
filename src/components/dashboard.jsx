// src/components/dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ProofGrid from './ProofGrid';
import UploadProof from './uploadProof';
import { Search, Filter, Upload, Users, LogOut, ArrowUpDown } from 'lucide-react';

// ─── Chain helpers ────────────────────────────────────────────────────────────
// Groups a flat proof list into revision chains and returns one representative
// object per job (the latest revision in each chain).
function buildChains(proofs) {
  const chainMap = new Map();

  proofs.forEach((proof) => {
    const key = proof.revisionChainId || proof.id;
    if (!chainMap.has(key)) chainMap.set(key, []);
    chainMap.get(key).push(proof);
  });

  // Sort each group newest-first so index 0 is always the latest revision
  chainMap.forEach((group) => {
    group.sort((a, b) => {
      const aRev = a.revisionNumber ?? 0;
      const bRev = b.revisionNumber ?? 0;
      if (bRev !== aRev) return bRev - aRev;
      const aTime = a.createdAt?.toDate?.() ?? new Date(0);
      const bTime = b.createdAt?.toDate?.() ?? new Date(0);
      return bTime - aTime;
    });
  });

  return Array.from(chainMap.values());
}

// Stats count chains, not raw docs. Each chain's status = latest revision's status.
const calcStats = (chains) =>
  chains.reduce(
    (acc, group) => {
      const latest = group[0];
      acc.total++;
      acc[latest.status] = (acc[latest.status] || 0) + 1;
      return acc;
    },
    { pending: 0, approved: 0, declined: 0, in_production: 0, in_quality_control: 0, completed: 0, total: 0 }
  );

export default function Dashboard() {
  const [proofs, setProofs] = useState([]);   // raw flat list from Firestore
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, declined: 0, in_production: 0, in_quality_control: 0, completed: 0, total: 0 });

  const { currentUser, userProfile, isAdmin, isClient, isDesigner, hasPermission } = useAuth();
  const [uploadedProofs, setUploadedProofs] = useState([]);
  const [assignedProofs, setAssignedProofs] = useState([]);

  // ─── Firestore listeners (unchanged) ────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    if (isAdmin()) {
      const q = query(collection(db, 'proofs'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setProofs(data);
      });
      return unsub;

    } else if (isClient()) {
      const q = query(collection(db, 'proofs'), where('clientId', '==', userProfile.clientId || userProfile.uid));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        setProofs(data);
      });
      return unsub;

    } else if (isDesigner()) {
      const unsubscribers = [];
      const uploadedQuery = query(collection(db, 'proofs'), where('uploadedBy', '==', userProfile.uid));
      const unsubUploaded = onSnapshot(uploadedQuery, (snapshot) => {
        setUploadedProofs(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      });
      unsubscribers.push(unsubUploaded);
      const assignedQuery = query(collection(db, 'proofs'), where('assignedTo', 'array-contains', userProfile.uid));
      const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
        setAssignedProofs(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      });
      unsubscribers.push(unsubAssigned);
      return () => unsubscribers.forEach((unsub) => unsub());
    }
  }, [currentUser, userProfile, isAdmin, isClient, isDesigner]);

  // ─── Combine designer proofs (unchanged) ────────────────────────────────────
  useEffect(() => {
    if (!isDesigner()) return;
    const combined = [...uploadedProofs];
    assignedProofs.forEach((proof) => {
      if (!combined.find((p) => p.id === proof.id)) combined.push(proof);
    });
    combined.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    setProofs(combined);
  }, [uploadedProofs, assignedProofs, isDesigner]);

  // ─── Chain-aware derived state ───────────────────────────────────────────────
  // All chains — recalculated only when raw proofs change
  const allChains = useMemo(() => buildChains(proofs), [proofs]);

  // Stats count chains, not raw docs
  useEffect(() => {
    setStats(calcStats(allChains));
  }, [allChains]);

  // Filtered chains — status filter matches latest revision; search matches ANY
  // revision in the chain (title, clientName, or id)
  const filteredChains = useMemo(() => {
    return allChains
      .filter((group) => {
        const latest = group[0];

        // Status: match against the latest revision's status
        const matchesFilter = filter === 'all' || latest.status === filter;

        // Search: match against any revision in the chain
        const matchesSearch =
          searchTerm === '' ||
          group.some((proof) => {
            const term = searchTerm.toLowerCase();
            return (
              proof.id.toLowerCase().includes(term) ||
              proof.title?.toLowerCase().includes(term) ||
              proof.clientName?.toLowerCase().includes(term)
            );
          });

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        // Sort by the latest revision's createdAt
        const aTime = a[0].createdAt?.toDate?.() || new Date(0);
        const bTime = b[0].createdAt?.toDate?.() || new Date(0);
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      });
  }, [allChains, filter, searchTerm, sortOrder]);

  // Flatten back to a raw proof list for ProofGrid — it does its own grouping
  // internally, so we just need all the relevant docs in there.
  const filteredProofs = useMemo(
    () => filteredChains.flat(),
    [filteredChains]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error('Error signing out:', error); }
  };

  const getRoleDisplayName = () => {
    switch (userProfile?.role) {
      case 'admin': return 'Administrator';
      case 'designer': return 'Designer';
      case 'client': return 'Client';
      default: return 'User';
    }
  };

  const StatCard = ({ label, value, filterKey, iconColor, bgColor, borderColor }) => {
    const isActive = filter === filterKey;
    return (
      <div
        onClick={() => setFilter(isActive ? 'all' : filterKey)}
        className={`rounded-lg shadow px-4 py-5 text-left w-full transition-all duration-200 border-2 cursor-pointer select-none ${
          isActive ? `${borderColor} shadow-md bg-gray-50` : 'bg-white border-transparent hover:shadow-md hover:border-gray-200'
        }`}
      >
        <div className="flex items-center">
          <div className={`p-2 ${bgColor} rounded-lg`}>
            <div className={`w-4 h-4 ${iconColor} rounded`}></div>
          </div>
          <div className="ml-4">
            <p className="text-xs font-medium text-gray-600 whitespace-nowrap">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    );
  };

  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cesar-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cesar Graphics</h1>
              <p className="text-sm text-gray-600">{getRoleDisplayName()} Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin() && (
                <Link to="/admin/users" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <Users size={16} />
                  Manage Users
                </Link>
              )}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {userProfile.displayName || userProfile.name || currentUser.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">{userProfile.role}</div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Cards — counts are now per-job, not per-revision */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          <div
            onClick={() => setFilter('all')}
            className={`rounded-lg shadow px-4 py-5 text-left w-full transition-all duration-200 border-2 cursor-pointer select-none ${
              filter === 'all' ? 'border-cesar-navy shadow-md bg-gray-50' : 'bg-white border-transparent hover:shadow-md hover:border-gray-200'
            }`}
          >
            <div className="flex items-center">
              <div className="p-2 bg-[#E0EAF5] rounded-lg">
                <div className="w-4 h-4 bg-cesar-navy rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600 whitespace-nowrap">
                  {isAdmin() ? 'Total Jobs' : 'Your Jobs'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <StatCard label="Pending"       value={stats.pending}            filterKey="pending"            iconColor="bg-cesar-yellow"   bgColor="bg-[#FEF3CD]"   borderColor="border-cesar-yellow" />
          <StatCard label="Approved"      value={stats.approved}           filterKey="approved"           iconColor="bg-cesar-green"    bgColor="bg-[#E6F9DD]"   borderColor="border-cesar-green" />
          <StatCard label="Declined"      value={stats.declined}           filterKey="declined"           iconColor="bg-cesar-magenta"  bgColor="bg-[#FCE4EC]"   borderColor="border-cesar-magenta" />
          <StatCard label="In Production" value={stats.in_production}      filterKey="in_production"      iconColor="bg-cesar-orange"   bgColor="bg-[#FFF0E0]"   borderColor="border-cesar-orange" />
          <StatCard label="In QC"         value={stats.in_quality_control} filterKey="in_quality_control" iconColor="bg-cesar-purple"   bgColor="bg-[#EDE7F6]"   borderColor="border-cesar-purple" />
          <StatCard label="Completed"     value={stats.completed}          filterKey="completed"          iconColor="bg-cesar-navy"     bgColor="bg-[#E0EAF5]"   borderColor="border-cesar-navy" />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                  <option value="in_production">In Production</option>
                  <option value="in_quality_control">In QC</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={16} className="text-gray-400" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
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
          {showUpload && hasPermission('canUploadProofs') && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <UploadProof onUploadComplete={() => setShowUpload(false)} />
            </div>
          )}
        </div>

        {isClient() && (
          <div className="bg-[#E0EAF5] border border-cesar-navy/20 rounded-lg p-4 mb-6">
            <p className="text-cesar-navy text-sm">
              <strong>Client View:</strong> You can only see proofs assigned to you. Click on any proof to approve, decline, or add comments.
            </p>
          </div>
        )}

        {isDesigner() && (
          <div className="bg-[#EDE7F6] border border-cesar-purple/20 rounded-lg p-4 mb-6">
            <p className="text-[#5A3695] text-sm">
              <strong>Designer View:</strong> You can see proofs assigned to you and upload new proofs for client approval.
            </p>
          </div>
        )}

        {/* Results count — jobs language, not proofs */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredChains.length} of {stats.total} {stats.total === 1 ? 'job' : 'jobs'}
            {filter !== 'all' && ` (filtered by ${filter.replace(/_/g, ' ')})`}
            {searchTerm && ` (searched for "${searchTerm}")`}
          </p>
        </div>

        <ProofGrid proofs={filteredProofs} />
      </div>
    </div>
  );
}