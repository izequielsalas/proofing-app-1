// src/components/CreateProfile.jsx
import { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function CreateProfile() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('User not logged in');

    setLoading(true);

    try {
      await setDoc(doc(db, 'users', user.uid), {
        name,
        company,
        phone,
        email: user.email,
        createdAt: new Date()
      });
      navigate('/dashboard');
      alert('Profile created!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Create Profile</h2>
      <input
        className="input"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        className="input"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-4 bg-navy text-navy py-2 px-4 rounded hover:bg-charcoal"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
