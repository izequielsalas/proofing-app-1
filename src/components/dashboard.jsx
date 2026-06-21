// src/components/dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Link, Navigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ProofGrid from './ProofGrid';
import UploadProof from './uploadProof';
import { Search, Filter, Upload, Users, LogOut, ArrowUpDown, FileText } from 'lucide-react';

// ─── Chain helpers ────────────────────────────────────────────────────────────
function buildChains(proofs) {
  const chainMap = new Map();

  proofs.forEach((proof) => {
    const key = proof.revisionChainId || proof.id;
    if (!chainMap.has(key)) chainMap.set(key, []);
    chainMap.get(key).push(proof);
  });

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

// Archived is a flag, not a status — a chain whose latest revision is
// archived gets counted under `archived` instead of its `status` bucket,
// so the Completed card (and any other status bucket) only ever reflects
// active, non-archived orders.
const calcStats = (chains) =>
  chains.reduce(
    (acc, group) => {
      const latest = group[0];
      acc.total++;
      if (latest.archived) {
        acc.archived = (acc.archived || 0) + 1;
      } else {
        acc[latest.status] = (acc[latest.status] || 0) + 1;
      }
      return acc;
    },
    {
      pending: 0,
      approved: 0,
      declined: 0,
      in_production: 0,
      in_quality_control: 0,
      ready_for_pickup: 0,
      out_for_delivery: 0,
      completed: 0,
      archived: 0,
      total: 0,
    }
  );

const KNOWN_ROLES = ['admin', 'designer', 'client', 'production'];

export default function Dashboard() {
  const [proofs, setProofs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [uploaderFilter, setUploaderFilter] = useState('all'); // 'all' | 'mine'
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
    in_production: 0,
    in_quality_control: 0,
    ready_for_pickup: 0,
    out_for_delivery: 0,
    completed: 0,
    archived: 0,
    total: 0,
  });

  const { currentUser, userProfile, isAdmin, isClient, isDesigner, hasPermission } = useAuth();

  // Only admin/designer get the "Uploaded by me" filter — it has no
  // meaningful use for clients (proofs are never uploaded by the client)
  // or production (not handled by this dashboard's queries at all).
  const canFilterByUploader = isAdmin() || isDesigner();

  // ─── Firestore listeners ─────────────────────────────────────────────────────
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
      // Designers now see every proof, same query as admin
      const q = query(collection(db, 'proofs'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setProofs(data);
      });
      return unsub;
    }
  }, [currentUser, userProfile, isAdmin, isClient, isDesigner]);

  // ─── Chain-aware derived state ───────────────────────────────────────────────
  const allChains = useMemo(() => buildChains(proofs), [proofs]);

  useEffect(() => {
    setStats(calcStats(allChains));
  }, [allChains]);

  // ─── Unique client list for filter dropdown (admin only) ──────────────────
  const uniqueClients = useMemo(() => {
    const names = new Set();
    proofs.forEach(p => { if (p.clientName) names.add(p.clientName); });
    return Array.from(names).sort();
  }, [proofs]);

  const filteredChains = useMemo(() => {
    return allChains
      .filter((group) => {
        const latest = group[0];
        const isArchived = !!latest.archived;
        // Default board ('all') is the active board: no completed, no
        // archived. Completed and Archived are each one filter click
        // away. Every other status branch also excludes archived, since
        // an archived order keeps its original `status` value (archived
        // is a flag, not a competing status) and shouldn't reappear
        // under its old status filter once archived.
        const matchesFilter =
          filter === 'all'
            ? (!isArchived && latest.status !== 'completed')
            : filter === 'archived'
            ? isArchived
            : filter === 'completed'
            ? (!isArchived && latest.status === 'completed')
            : filter === 'fulfillment'
            ? (!isArchived && (latest.status === 'ready_for_pickup' || latest.status === 'out_for_delivery'))
            : (!isArchived && latest.status === filter);
        const matchesClient = clientFilter === 'all' || latest.clientName === clientFilter;
        const matchesUploader = !canFilterByUploader || uploaderFilter === 'all' || latest.uploadedBy === userProfile?.uid;
        const matchesSearch =
          searchTerm === '' ||
          group.some((proof) => {
            const term = searchTerm.toLowerCase();
              return (
                proof.id.toLowerCase().includes(term) ||
                proof.title?.toLowerCase().includes(term) ||
                proof.clientName?.toLowerCase().includes(term) ||
                proof.invoiceNumber?.toLowerCase().includes(term)
              );
          });
        return matchesFilter && matchesSearch && matchesClient && matchesUploader;
      })
      .sort((a, b) => {
        const aTime = a[0].createdAt?.toDate?.() || new Date(0);
        const bTime = b[0].createdAt?.toDate?.() || new Date(0);
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      });
  }, [allChains, filter, searchTerm, sortOrder, clientFilter, uploaderFilter, userProfile, canFilterByUploader]);

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
      case 'production': return 'Production';
      case 'client': return 'Client';
      default: return 'User';
    }
  };


  const StatCard = ({ label, value, filterKey, iconColor, bgColor, borderColor }) => {
    const isActive = filter === filterKey;
    return (
      <div
        onClick={() => setFilter(isActive ? 'all' : filterKey)}
        className={`rounded-lg shadow px-3 py-4 text-left w-full transition-all duration-200 border-2 cursor-pointer select-none ${
          isActive ? `${borderColor} shadow-md bg-gray-50` : 'bg-white border-transparent hover:shadow-md hover:border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 ${bgColor} rounded-lg flex-shrink-0`}>
            <div className={`w-4 h-4 ${iconColor} rounded`}></div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-600 leading-tight">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    );
  };

  // ─── Guards ──────────────────────────────────────────────────────────────────
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

  if (!KNOWN_ROLES.includes(userProfile.role) || userProfile.isActive === false) {
    return <Navigate to="/unauthorized" replace />;
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
              {isAdmin() && (
                <Link to="/admin/proofs" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <FileText size={16} />
                  Manage Proofs
                </Link>
              )}
              {isClient() && (
                <Link to="/my-orders" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <FileText size={16} />
                  Order History
                </Link>
              )}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {userProfile.displayName || userProfile.name || currentUser.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">{userProfile.role}</div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
          <StatCard
            label={isAdmin() || isDesigner() ? 'Total Jobs' : 'Your Jobs'}
            value={stats.total}
            filterKey="all"
            iconColor="bg-cesar-navy"
            bgColor="bg-[#E0EAF5]"
            borderColor="border-cesar-navy"
          />
          <StatCard label="Pending"       value={stats.pending}            filterKey="pending"            iconColor="bg-cesar-yellow"   bgColor="bg-[#FEF3CD]"   borderColor="border-cesar-yellow" />
          <StatCard label="Approved"      value={stats.approved}           filterKey="approved"           iconColor="bg-cesar-green"    bgColor="bg-[#E6F9DD]"   borderColor="border-cesar-green" />
          <StatCard label="Declined"      value={stats.declined}           filterKey="declined"           iconColor="bg-cesar-magenta"  bgColor="bg-[#FCE4EC]"   borderColor="border-cesar-magenta" />
          <StatCard label="Production"    value={stats.in_production}      filterKey="in_production"      iconColor="bg-cesar-orange"   bgColor="bg-[#FFF0E0]"   borderColor="border-cesar-orange" />
          <StatCard label="QC"            value={stats.in_quality_control} filterKey="in_quality_control" iconColor="bg-cesar-purple"   bgColor="bg-[#EDE7F6]"   borderColor="border-cesar-purple" />
          <StatCard
            label="Fulfillment"
            value={(stats.ready_for_pickup || 0) + (stats.out_for_delivery || 0)}
            filterKey="fulfillment"
            iconColor="bg-[#0A6B6B]"
            bgColor="bg-[#DFF7F5]"
            borderColor="border-[#0A6B6B]"
          />
          <StatCard label="Completed"     value={stats.completed}          filterKey="completed"          iconColor="bg-[#0099CC]"      bgColor="bg-[#D6F0FF]"   borderColor="border-[#0099CC]" />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">

              {/* Search */}
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

              {/* Status filter */}
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
                  <option value="in_production">Production</option>
                  <option value="in_quality_control">QC</option>
                  <option value="fulfillment">Fulfillment (Pickup/Delivery)</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Sort */}
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

              {/* Client filter — admin only */}
              {isAdmin() && uniqueClients.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
                  >
                    <option value="all">All Clients</option>
                    {uniqueClients.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Uploaded by me filter — admin/designer only. Clients never
                  upload their own proofs and production isn't served by
                  this dashboard's data, so the filter has no use for either. */}
              {canFilterByUploader && (
                <button
                  onClick={() => setUploaderFilter(prev => (prev === 'mine' ? 'all' : 'mine'))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    uploaderFilter === 'mine'
                      ? 'bg-cesar-navy text-white border-cesar-navy'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Users size={16} />
                  Uploaded by me
                </button>
              )}
            </div>

            {hasPermission('canUploadProofs') && !showUpload && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cesar-navy hover:bg-[#003d73] text-white rounded-lg"
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
              <strong>Designer View:</strong> You can see all proofs and upload new proofs for client approval.
            </p>
          </div>
        )}

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredChains.length} of {stats.total} {stats.total === 1 ? 'job' : 'jobs'}
            {filter !== 'all' && ` · filtered by ${filter.replace(/_/g, ' ')}`}
            {clientFilter !== 'all' && ` · client: ${clientFilter}`}
            {canFilterByUploader && uploaderFilter === 'mine' && ` · uploaded by me`}
            {searchTerm && ` · search: "${searchTerm}"`}
          </p>
        </div>

        <ProofGrid proofs={filteredProofs} />
      </div>
    </div>
  );
}