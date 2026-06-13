// src/components/ProductionDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import {
  Factory, Plus, X, Edit2, Save, ArrowUp, ArrowDown,
  LogOut, MessageSquare, Calendar, User, ChevronRight,
  ChevronLeft, Settings, RotateCcw, FileText, Play
} from 'lucide-react';
import Modal from './Modal';

const DEFAULT_COLUMNS = ['To Do', 'In Progress'];

export default function ProductionDashboard() {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const department = userProfile?.department;

  const [proofs, setProofs] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);

  // Column management
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState(null);
  const [editingColName, setEditingColName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [savingColumns, setSavingColumns] = useState(false);

  // ── Load column config ────────────────────────────────────────
  useEffect(() => {
    if (!department) return;
    const loadColumns = async () => {
      try {
        const deptDoc = await getDoc(doc(db, 'settings', 'departments'));
        const data = deptDoc.exists() ? deptDoc.data() : {};
        const deptColumns = data[department];
        setColumns(deptColumns?.length > 0 ? deptColumns : DEFAULT_COLUMNS);
      } catch (err) {
        console.error('Error loading columns:', err);
        setColumns(DEFAULT_COLUMNS);
      } finally {
        setLoadingColumns(false);
      }
    };
    loadColumns();
  }, [department]);

  // ── Save columns to Firestore ─────────────────────────────────
  const saveColumns = async (updatedColumns) => {
    if (!department) return;
    setSavingColumns(true);
    try {
      const deptDoc = await getDoc(doc(db, 'settings', 'departments'));
      const data = deptDoc.exists() ? deptDoc.data() : {};
      await setDoc(doc(db, 'settings', 'departments'), {
        ...data,
        [department]: updatedColumns,
      });
      setColumns(updatedColumns);
    } catch (err) {
      console.error('Error saving columns:', err);
      alert('Failed to save column changes.');
    } finally {
      setSavingColumns(false);
    }
  };

  // ── Load proofs for this department ──────────────────────────
  useEffect(() => {
    if (!department) return;
    const q = query(
      collection(db, 'proofs'),
      where('tags', 'array-contains', department),
      where('status', '==', 'in_production')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProofs(list);
      setLoadingProofs(false);
    });
    return () => unsubscribe();
  }, [department]);

  // ── Column assignment ─────────────────────────────────────────
  const getProofsForColumn = (column) => {
    const isFirstColumn = column === columns[0];
    return proofs.filter(proof => {
      if (isFirstColumn) {
        return !proof.productionColumn || proof.productionColumn === columns[0];
      }
      return proof.productionColumn === column;
    });
  };

  // ── Drag and drop ─────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const targetColumn = destination.droppableId;
    const isFirstCol = targetColumn === columns[0];
    const proof = proofs.find(p => p.id === draggableId);
    if (!proof) return;

    // If dragging to the first column, clear productionColumn
    // If dragging from first column (Start action via drag), set productionStartedAt
    const isStarting = source.droppableId === columns[0] && !isFirstCol && !proof.productionColumn;

    try {
      const updateData = {
        productionColumn: isFirstCol ? null : targetColumn,
        updatedAt: serverTimestamp(),
        updatedByRole: userProfile?.role || 'production',
      };
      if (isStarting) {
        updateData.productionStartedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'proofs', draggableId), updateData);
    } catch (err) {
      console.error('Error moving proof via drag:', err);
    }
  };

  // ── Card actions ──────────────────────────────────────────────
  const handleStart = async (proof) => {
    const inProgressCol = columns[1] || columns[0];
    try {
      await updateDoc(doc(db, 'proofs', proof.id), {
        productionColumn: inProgressCol,
        productionStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedByRole: userProfile?.role || 'production',
      });
    } catch (err) {
      console.error('Error starting proof:', err);
      alert('Failed to start order. Please try again.');
    }
  };

  const handleMoveBack = async (proof) => {
    const colIndex = columns.indexOf(proof.productionColumn);
    const prevCol = colIndex <= 1 ? null : columns[colIndex - 1];
    try {
      await updateDoc(doc(db, 'proofs', proof.id), {
        productionColumn: prevCol,
        updatedAt: serverTimestamp(),
        updatedByRole: userProfile?.role || 'production',
      });
    } catch (err) {
      console.error('Error sending back:', err);
      alert('Failed to send back. Please try again.');
    }
  };

  const handleMoveForward = async (proof) => {
    const colIndex = columns.indexOf(proof.productionColumn);
    const nextCol = columns[colIndex + 1];
    if (!nextCol) return;
    try {
      await updateDoc(doc(db, 'proofs', proof.id), {
        productionColumn: nextCol,
        updatedAt: serverTimestamp(),
        updatedByRole: userProfile?.role || 'production',
      });
    } catch (err) {
      console.error('Error moving forward:', err);
    }
  };

  // ── Column manager actions ────────────────────────────────────
  const handleAddColumn = () => {
    const trimmed = newColName.trim();
    if (!trimmed) return;
    if (columns.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setNewColName('');
    saveColumns([...columns, trimmed]);
  };

  const handleDeleteColumn = (index) => {
    if (columns.length <= 1) return;
    saveColumns(columns.filter((_, i) => i !== index));
  };

  const handleRenameColumn = (index) => {
    setEditingColIndex(index);
    setEditingColName(columns[index]);
  };

  const handleSaveRename = () => {
    const trimmed = editingColName.trim();
    if (!trimmed) return;
    const updated = columns.map((c, i) => i === editingColIndex ? trimmed : c);
    setEditingColIndex(null);
    setEditingColName('');
    saveColumns(updated);
  };

  const handleMoveColUp = (index) => {
    if (index === 0) return;
    const updated = [...columns];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    saveColumns(updated);
  };

  const handleMoveColDown = (index) => {
    if (index === columns.length - 1) return;
    const updated = [...columns];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    saveColumns(updated);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  // ── Helpers ───────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return '—'; }
  };

  const getLatestNote = (proof) => {
    const notes = proof.notes_list;
    if (!notes || notes.length === 0) return null;
    return notes[notes.length - 1];
  };

  if (!department) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow">
          <Factory className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Department Assigned</h2>
          <p className="text-gray-500 text-sm">Your account doesn't have a department assigned. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="w-6 h-6 text-cesar-navy" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Production — {department}</h1>
              <p className="text-xs text-gray-500">
                {loadingProofs ? 'Loading...' : `${proofs.length} active order${proofs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showColumnManager ? 'bg-cesar-navy text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Settings size={15} />
              Customize Board
            </button>
            {isAdmin() && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
              >
                Admin Dashboard
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Column Manager Panel */}
        {showColumnManager && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-gray-700 mb-3">Manage Columns for {department}</p>
              <div className="space-y-2 mb-3">
                {columns.map((col, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                    {editingColIndex === index ? (
                      <input
                        type="text"
                        value={editingColName}
                        onChange={e => setEditingColName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditingColIndex(null); }}
                        className="flex-1 text-sm border-none outline-none focus:ring-0 p-0"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-sm text-gray-800">{col}</span>
                    )}
                    <div className="flex items-center gap-1">
                      {editingColIndex === index ? (
                        <>
                          <button onClick={handleSaveRename} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={13} /></button>
                          <button onClick={() => setEditingColIndex(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                        </>
                      ) : (
                        <button onClick={() => handleRenameColumn(index)} className="p-1 text-gray-400 hover:text-cesar-navy hover:bg-gray-100 rounded"><Edit2 size={13} /></button>
                      )}
                      <button onClick={() => handleMoveColUp(index)} disabled={index === 0} className="p-1 text-gray-400 hover:text-cesar-navy hover:bg-gray-100 rounded disabled:opacity-20"><ArrowUp size={13} /></button>
                      <button onClick={() => handleMoveColDown(index)} disabled={index === columns.length - 1} className="p-1 text-gray-400 hover:text-cesar-navy hover:bg-gray-100 rounded disabled:opacity-20"><ArrowDown size={13} /></button>
                      <button onClick={() => handleDeleteColumn(index)} disabled={columns.length <= 1} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-20"><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); }}
                  placeholder="New column name..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                />
                <button
                  onClick={handleAddColumn}
                  disabled={!newColName.trim() || savingColumns}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cesar-navy text-white text-sm rounded-lg hover:bg-[#003070] disabled:opacity-50 transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        {loadingProofs || loadingColumns ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cesar-navy"></div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-5 min-w-max">
              {columns.map((column, colIndex) => {
                const columnProofs = getProofsForColumn(column);
                const isFirstCol = colIndex === 0;

                return (
                  <div key={column} className="w-80 flex-shrink-0">
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{column}</h2>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                        {columnProofs.length}
                      </span>
                    </div>

                    {/* Droppable column */}
                    <Droppable droppableId={column}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-24 rounded-xl transition-colors space-y-3 p-1 ${
                            snapshot.isDraggingOver ? 'bg-cesar-navy/5 ring-2 ring-cesar-navy/20' : ''
                          }`}
                        >
                          {columnProofs.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="bg-white/60 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                              No orders
                            </div>
                          ) : (
                            columnProofs.map((proof, index) => (
                              <Draggable key={proof.id} draggableId={proof.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                  >
                                    <ProductionCard
                                      proof={proof}
                                      column={column}
                                      columns={columns}
                                      isFirstCol={isFirstCol}
                                      isDragging={snapshot.isDragging}
                                      onStart={handleStart}
                                      onMoveBack={handleMoveBack}
                                      onMoveForward={handleMoveForward}
                                      onOpen={setSelectedProof}
                                      formatDate={formatDate}
                                      getLatestNote={getLatestNote}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Proof Modal */}
      {selectedProof && (
        <Modal
          project={selectedProof}
          onClose={() => setSelectedProof(null)}
        />
      )}
    </div>
  );
}

// ── Production Card ────────────────────────────────────────────
function ProductionCard({ proof, column, columns, isFirstCol, isDragging, onStart, onMoveBack, onMoveForward, onOpen, formatDate, getLatestNote }) {
  const latestNote = getLatestNote(proof);
  const approvedDate = proof.approvedAt || proof.updatedAt;
  const colIndex = columns.indexOf(column);
  const hasNextCol = colIndex < columns.length - 1;
  const hasPrevCol = colIndex > 0;
  const isStarted = !!proof.productionColumn;

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      isDragging ? 'shadow-xl border-cesar-navy/30 rotate-1 scale-105' : 'shadow-sm border-gray-200 hover:shadow-md'
    }`}>

      {/* Thumbnail */}
      <div
        className="relative bg-gray-100 h-36 cursor-pointer overflow-hidden"
        onClick={() => onOpen(proof)}
      >
        {proof.thumbnailUrl ? (
          <img
            src={proof.thumbnailUrl}
            alt={proof.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
          <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">View Proof</span>
        </div>
        {/* Drag handle hint */}
        <div className="absolute top-2 right-2 opacity-40">
          <div className="grid grid-cols-2 gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-white rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3">
        <h3
          className="font-semibold text-gray-900 text-sm leading-tight cursor-pointer hover:text-cesar-navy transition-colors mb-0.5 truncate"
          onClick={() => onOpen(proof)}
          title={proof.title}
        >
          {proof.title}
        </h3>
        {proof.clientName && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <User size={10} />
            {proof.clientName}
          </div>
        )}

        {/* Tags */}
        {proof.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {proof.tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-cesar-navy/10 text-cesar-navy font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Date */}
        {approvedDate && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <Calendar size={10} />
            {formatDate(approvedDate)}
          </div>
        )}

        {/* Latest note preview */}
        {latestNote && (
          <div className="flex items-start gap-1.5 mb-3 p-2 bg-gray-50 rounded-lg">
            <MessageSquare size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              <span className="font-medium text-gray-600">{latestNote.authorName}:</span>{' '}
              {latestNote.text}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
          {/* Start button — only in first col when not yet started */}
          {isFirstCol && !isStarted && (
            <button
              onClick={() => onStart(proof)}
              className="flex items-center gap-1 px-2.5 py-1 bg-cesar-navy text-white text-xs rounded-lg hover:bg-[#003070] transition-colors font-medium"
            >
              <Play size={11} />
              Start
            </button>
          )}

          {/* Back button — any col except first */}
          {hasPrevCol && isStarted && (
            <button
              onClick={() => onMoveBack(proof)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors"
              title="Move back one column"
            >
              <ChevronLeft size={12} />
            </button>
          )}

          {/* Forward button — any col except last */}
          {hasNextCol && isStarted && (
            <button
              onClick={() => onMoveForward(proof)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors"
              title={`Move to ${columns[colIndex + 1]}`}
            >
              <ChevronRight size={12} />
              <span className="max-w-16 truncate">{columns[colIndex + 1]}</span>
            </button>
          )}

          {/* Column indicator */}
          <span className="ml-auto text-xs text-gray-300 truncate max-w-20" title={column}>
            {column}
          </span>
        </div>
      </div>
    </div>
  );
}