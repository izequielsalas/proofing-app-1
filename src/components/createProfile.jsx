// src/components/CreateProfile.jsx
import { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { User, Building, Phone, Mail } from 'lucide-react';

export default function CreateProfile() {
  const [formData, setFormData] = useState({
    displayName: '',
    company: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('User not logged in');

    const { displayName, company, phone } = formData;
    
    if (!displayName.trim()) {
      return alert('Please enter your full name');
    }

    setLoading(true);

    try {
      // Create user profile with default client role
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        company: company.trim(),
        phone: phone.trim(),
        role: 'client', // Default role for new users
        clientId: user.uid, // For clients, their clientId is their own uid
        isActive: true,
        permissions: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#E0EAF5] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-cesar-navy" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h2>
            <p className="text-gray-600">
              Please provide some basic information to get started
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="input pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company (Optional)
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company or organization"
                  className="input pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="input pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#E0EAF5] border border-cesar-navy/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-[#E0EAF5] border border-cesar-navy/30 rounded-full flex items-center justify-center">
                    <span className="text-cesar-navy text-xs font-bold">i</span>
                  </div>
                </div>
                <div className="text-sm text-cesar-navy">
                  <p className="font-medium mb-1">Account Setup</p>
                  <p>
                    Your account will be created as a <strong>Client</strong> with proof review permissions. 
                    An administrator can update your role if needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Welcome to Cesar Graphics Proofing System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}