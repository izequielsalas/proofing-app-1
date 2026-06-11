// src/components/AdminTags.jsx
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Tag, Plus, Trash2, ArrowUp, ArrowDown, Shield, ArrowLeft, Save, X, CheckCircle
} from 'lucide-react';

export default function AdminTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [addError, setAddError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const { isAdmin } = useAuth();

  // ── Load tags from Firestore ──────────────────────────────────
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tagDoc = await getDoc(doc(db, 'settings', 'tags'));
        if (tagDoc.exists()) {
          setTags(tagDoc.data().list || []);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  // ── Save tags to Firestore ────────────────────────────────────
  const saveTags = async (updatedTags) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'tags'), { list: updatedTags });
      setTags(updatedTags);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      console.error('Error saving tags:', err);
      alert('Failed to save tags. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Add tag ───────────────────────────────────────────────────
  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (tags.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
      setAddError('That tag already exists.');
      return;
    }
    setAddError('');
    setNewTag('');
    saveTags([...tags, trimmed]);
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') handleAddTag();
    if (e.key === 'Escape') { setNewTag(''); setAddError(''); }
  };

  // ── Delete tag ────────────────────────────────────────────────
  const handleDelete = (index) => {
    const updated = tags.filter((_, i) => i !== index);
    saveTags(updated);
  };

  // ── Move tag up/down ──────────────────────────────────────────
  const moveTag = (index, direction) => {
    const updated = [...tags];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= updated.length) return;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    saveTags(updated);
  };

  // ── Guard ─────────────────────────────────────────────────────
  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-cesar-magenta mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage tags.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cesar-navy"></div>
        <span className="ml-2 text-gray-600">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="w-6 h-6 text-cesar-navy" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tag Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Tags appear on orders and are used to route jobs to the right production department.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </div>

      {/* Add New Tag */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Tag</h2>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newTag}
              onChange={e => { setNewTag(e.target.value); setAddError(''); }}
              onKeyDown={handleAddKeyDown}
              placeholder="e.g. Vehicle Wraps"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy text-sm"
            />
            {addError && (
              <p className="text-xs text-red-600 mt-1">{addError}</p>
            )}
          </div>
          <button
            onClick={handleAddTag}
            disabled={!newTag.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Tag List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Current Tags</h2>
            <p className="text-xs text-gray-500 mt-0.5">{tags.length} tag{tags.length !== 1 ? 's' : ''} — use arrows to reorder</p>
          </div>
          {savedFlash && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle size={16} />
              Saved
            </div>
          )}
        </div>

        {tags.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            No tags yet. Add one above.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tags.map((tag, index) => (
              <li key={tag} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cesar-navy/10 text-cesar-navy">
                    {tag}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveTag(index, -1)}
                    disabled={index === 0 || saving}
                    className="p-1.5 rounded text-gray-400 hover:text-cesar-navy hover:bg-gray-100 transition-colors disabled:opacity-20"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveTag(index, 1)}
                    disabled={index === tags.length - 1 || saving}
                    className="p-1.5 rounded text-gray-400 hover:text-cesar-navy hover:bg-gray-100 transition-colors disabled:opacity-20"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    disabled={saving}
                    className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 ml-1"
                    title="Delete tag"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info box */}
      <div className="bg-[#E0EAF5] border border-cesar-navy/20 rounded-lg p-4 text-sm text-cesar-navy">
        <p className="font-medium mb-1">How tags work</p>
        <p className="text-cesar-navy/70">Tags are added to orders at upload time. The production dashboard uses tags to filter which orders appear for each department. Changes here take effect immediately for all new uploads.</p>
      </div>

    </div>
  );
}