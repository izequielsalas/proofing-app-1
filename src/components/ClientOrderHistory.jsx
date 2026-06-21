// src/components/ClientOrderHistory.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, FileText, Archive } from 'lucide-react';

// Mirrors the status badge styling used in Modal.jsx's Order History
// panel, so a client sees the same colors/labels staff see internally.
const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return 'text-[#2D7A0F] bg-[#E6F9DD] border-cesar-green';
    case 'declined': return 'text-[#A8005A] bg-[#FCE4EC] border-cesar-magenta';
    case 'in_production': return 'text-[#B34D00] bg-[#FFF0E0] border-cesar-orange';
    case 'in_quality_control': return 'text-[#5A3695] bg-[#EDE7F6] border-cesar-purple';
    case 'ready_for_pickup': return 'text-[#0A6B6B] bg-[#DFF7F5] border-[#0A6B6B]';
    case 'out_for_delivery': return 'text-[#0A6B6B] bg-[#DFF7F5] border-[#0A6B6B]';
    case 'completed': return 'text-cesar-navy bg-[#E0EAF5] border-cesar-navy';
    default: return 'text-[#92690B] bg-[#FEF3CD] border-cesar-yellow';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'in_production': return 'In Production';
    case 'in_quality_control': return 'In Quality Control';
    case 'ready_for_pickup': return 'Ready for Pickup';
    case 'out_for_delivery': return 'Out for Delivery';
    default: return status?.charAt(0).toUpperCase() + status?.slice(1);
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

export default function ClientOrderHistory() {
  const { currentUser, userProfile, isClient } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This page is client-only — bounce anyone else back to their dashboard,
  // same pattern AdminProofs.jsx uses for its admin-only guard.
  useEffect(() => {
    if (userProfile && !isClient()) navigate('/dashboard');
  }, [userProfile, isClient, navigate]);

  // Full history — active + completed + archived, unlike the main
  // dashboard which now hides completed/archived by default.
  useEffect(() => {
    if (!currentUser || !userProfile || !isClient()) return;

    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, 'proofs'),
          where('clientId', '==', userProfile.clientId || userProfile.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
        setOrders(data);
      } catch (err) {
        console.error('Error loading order history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [currentUser, userProfile, isClient]);

  if (!userProfile || !isClient()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cesar-navy"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-gray-900">Order History</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cesar-navy"></div>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg">
            Could not load your order history: {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
            <p className="px-5 py-3 text-xs text-gray-400">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </p>
            {orders.map(order => (
              <div key={order.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-1">
                    {order.title || `Proof #${order.id.slice(-6)}`}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    {order.archived && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 flex items-center gap-1">
                        <Archive size={11} />
                        Archived
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                {order.invoiceNumber && (
                  <span className="text-sm text-gray-400 flex-shrink-0">#{order.invoiceNumber}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}