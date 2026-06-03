// src/components/AdminProofs.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, Edit2, Save, X, Search, RefreshCw,
  ArrowLeft, AlertTriangle, ChevronDown, User,
  FileText, GitBranch, CheckCircle, Clock,
  Factory, FlaskConical, PackageCheck, XCircle
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Review', color: 'bg-[#FEF3CD] text-[#92690B]' },
  { value: 'approved', label: 'Approved', color: 'bg-[#E6F9DD] text-[#2D7A0F]' },
  { value: 'declined', label: 'Declined', color: 'bg-[#FCE4EC] text-[#A8005A]' },
  { value: 'in_production', label: 'In Production', color: 'bg-[#FFF0E0] text-[#B34D00]' },
  { value: 'in_quality_control', label: 'In QC', color: 'bg-[#EDE7F6] text-[#5A3695]' },
  { value: 'completed', label: 'Completed', color: 'bg-[#DBEAFE] text-[#0066CC]' },
];

const getStatusStyle = (status) =>
  STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-600';

const getStatusLabel = (status) =>
  STATUS_OPTIONS.find(s => s.value === status)?.label || status;

const getStatusIcon = (status) => {
  switch (status) {
    case 'approved': return <CheckCircle className="w-3.5 h-3.5" />;
    case 'declined': return <XCircle className="w-3.5 h-3.5" />;
    case 'in_production': return <Factory className="w-3.5 h-3.5" />;
    case 'in_quality_control': return <FlaskConical className="w-3.5 h-3.5" />;
    case 'completed': return <PackageCheck className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

export default function AdminProofs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [proofs, setProofs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteChain, setDeleteChain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin()) navigate('/dashboard');
  }, [isAdmin, navigate]);

  // Fetch clients for reassignment dropdown
  useEffect(() => {
    const fetchClients = async () => {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client')));
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchClients();
  }, []);

  // Live proofs listener
  useEffect(() => {
    const q = query(collection(db, 'proofs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (proof) => {
    setEditingId(proof.id);
    setEditForm({
      title: proof.title || '',
      status: proof.status || 'pending',
      clientId: proof.clientId || '',
      notes: proof.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (proof) => {
    setSaving(true);
    try {
      const updates = {
        title: editForm.title.trim(),
        status: editForm.status,
        notes: editForm.notes.trim(),
        updatedAt: serverTimestamp(),
      };

      // If client reassigned, update client info
      if (editForm.clientId !== proof.clientId) {
        const newClient = clients.find(c => c.id === editForm.clientId);
        if (newClient) {
          updates.clientId = newClient.id;
          updates.clientName = newClient.displayName || newClient.email;
          updates.clientEmail = newClient.email;
        }
      }

      await updateDoc(doc(db, 'proofs', proof.id), updates);

      // If title changed and this proof is part of a chain, update all siblings
      if (editForm.title.trim() !== proof.title && proof.revisionChainId) {
        const chainSnap = await getDocs(
          query(collection(db, 'proofs'), where('revisionChainId', '==', proof.revisionChainId))
        );
        const siblings = chainSnap.docs.filter(d => d.id !== proof.id);
        await Promise.all(siblings.map(d =>
          updateDoc(d.ref, { title: editForm.title.trim(), updatedAt: serverTimestamp() })
        ));
      }

      setEditingId(null);
      showToast('Proof updated successfully');
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteChain && deleteTarget.revisionChainId) {
        // Delete entire revision chain
        const chainSnap = await getDocs(
          query(collection(db, 'proofs'), where('revisionChainId', '==', deleteTarget.revisionChainId))
        );
        await Promise.all(chainSnap.docs.map(d => deleteDoc(d.ref)));
        showToast(`Deleted ${chainSnap.size} proofs in revision chain`);
      } else {
        await deleteDoc(doc(db, 'proofs', deleteTarget.id));
        showToast('Proof deleted');
      }
      setDeleteTarget(null);
      setDeleteChain(false);
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete proof', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = proofs.filter(p => {
    const matchesSearch =
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-[#FCE4EC] text-[#A8005A]' : 'bg-[#E6F9DD] text-[#2D7A0F]'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FCE4EC] rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#A8005A]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Proof</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              You're about to delete <span className="font-medium">"{deleteTarget.title}"</span>
              {deleteTarget.revisionNumber > 1 && ` (v${deleteTarget.revisionNumber})`}.
            </p>

            {deleteTarget.revisionChainId && (
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteChain}
                  onChange={e => setDeleteChain(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Delete entire revision chain</p>
                  <p className="text-xs text-gray-500 mt-0.5">Removes all versions of this proof, not just this one</p>
                </div>
              </label>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteChain(false); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-[#A8005A] text-white rounded-lg hover:bg-[#8a0049] text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Proof Management</h1>
              <p className="text-xs text-gray-500">{proofs.length} total proofs</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy/20 focus:border-cesar-navy"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy/20 focus:border-cesar-navy bg-white"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <span className="text-sm text-gray-400 ml-auto">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cesar-navy" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No proofs found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proof</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(proof => (
                  <tr key={proof.id} className={`hover:bg-gray-50 transition-colors ${editingId === proof.id ? 'bg-[#F0F4FF]' : ''}`}>

                    {/* Proof title / version */}
                    <td className="px-4 py-3">
                      {editingId === proof.id ? (
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-cesar-navy/30 rounded focus:outline-none focus:ring-2 focus:ring-cesar-navy/20"
                        />
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 line-clamp-1">{proof.title}</span>
                            {proof.revisionNumber > 1 && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                                <GitBranch className="w-3 h-3" />
                                v{proof.revisionNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{proof.id}</p>
                        </div>
                      )}
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      {editingId === proof.id ? (
                        <select
                          value={editForm.clientId}
                          onChange={e => setEditForm(f => ({ ...f, clientId: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-cesar-navy/30 rounded focus:outline-none focus:ring-2 focus:ring-cesar-navy/20 bg-white"
                        >
                          <option value="">— Unassigned —</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.displayName || c.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#E0EAF5] flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-cesar-navy" />
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium leading-tight">{proof.clientName || '—'}</p>
                            <p className="text-xs text-gray-400">{proof.clientEmail || ''}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {editingId === proof.id ? (
                        <select
                          value={editForm.status}
                          onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                          className="px-2 py-1 text-sm border border-cesar-navy/30 rounded focus:outline-none focus:ring-2 focus:ring-cesar-navy/20 bg-white"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(proof.status)}`}>
                          {getStatusIcon(proof.status)}
                          {getStatusLabel(proof.status)}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(proof.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {editingId === proof.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(proof)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cesar-navy text-white rounded-lg text-xs font-medium hover:bg-[#003d73] disabled:opacity-50 transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(proof)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 hover:border-cesar-navy/30 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => { setDeleteTarget(proof); setDeleteChain(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-[#FCE4EC] hover:border-[#A8005A]/30 hover:text-[#A8005A] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}