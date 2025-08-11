import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { getAuth, updateEmail, updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { FaUser, FaLock, FaMapMarkerAlt, FaBell, FaShieldAlt, FaCamera, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    photoURL: null,
    previewImage: null,
    namaPenerima: '',
    nomorTelepon: '',
    alamat: '',
    detailLainnya: '',
    coords: { lat: null, lng: null },
    notifications: {
      email: {
        orderUpdates: true,
        promotions: true,
        newsletter: false
      },
      push: {
        orderUpdates: true,
        messages: true
      }
    },
    privacy: {
      analytics: true,
      personalizedAds: false,
      publicProfile: true,
      showEmail: false
    }
  });
  const [errors, setErrors] = useState({});
  const auth = getAuth();
  const storage = getStorage();

  // Tab configuration for cleaner code
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FaUser className="mr-2" /> },
    { id: 'account', label: 'Account', icon: <FaLock className="mr-2" /> },
    { id: 'address', label: 'Address', icon: <FaMapMarkerAlt className="mr-2" /> },
    { id: 'notifications', label: 'Notifications', icon: <FaBell className="mr-2" /> },
    { id: 'privacy', label: 'Privacy', icon: <FaShieldAlt className="mr-2" /> }
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData(prev => ({
              ...prev,
              name: userData.name || user?.displayName || '',
              username: userData.username || '',
              email: user?.email || '',
              namaPenerima: userData.namaPenerima || '',
              nomorTelepon: userData.nomorTelepon || '',
              alamat: userData.alamat || '',
              detailLainnya: userData.detailLainnya || '',
              coords: userData.coords || { lat: null, lng: null },
              photoURL: user?.photoURL || null,
              notifications: userData.notifications || prev.notifications,
              privacy: userData.privacy || prev.privacy
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              name: user?.displayName || '',
              email: user?.email || '',
              photoURL: user?.photoURL || null
            }));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Failed to load user data');
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({
      ...prev,
      nomorTelepon: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photoURL: file,
          previewImage: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNotificationChange = (type, category, value) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: {
          ...prev.notifications[type],
          [category]: value
        }
      }
    }));
  };

  const handlePrivacyChange = (setting, value) => {
    setFormData(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [setting]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (activeTab === 'profile') {
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.namaPenerima.trim()) newErrors.namaPenerima = 'Recipient name is required';
      if (!formData.nomorTelepon) newErrors.nomorTelepon = 'Phone number is required';
      if (!formData.alamat.trim()) newErrors.alamat = 'Address is required';
    }
    
    if (activeTab === 'account') {
      if (!formData.currentPassword && (formData.newPassword || formData.email !== user.email)) {
        newErrors.currentPassword = 'Current password is required to make changes';
      }
      
      if (formData.newPassword && formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      
      if (formData.email !== user?.email && !formData.email) {
        newErrors.email = 'Email is required';
      } else if (formData.email !== user.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers and underscores';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const updates = {};
      const dbUpdates = {};
      const now = new Date();
      
      // Handle profile picture upload to ImgBB
      if (formData.photoURL && typeof formData.photoURL !== 'string') {
        const formDataImgBB = new FormData();
        formDataImgBB.append('image', formData.photoURL);
        
        const response = await fetch('https://api.imgbb.com/1/upload?key=5c0156550435c0408de9ab844fd15e8e', {
          method: 'POST',
          body: formDataImgBB
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error('Failed to upload image to ImgBB');
        }
        
        const downloadURL = data.data.url;
        updates.photoURL = downloadURL;
        dbUpdates.photoURL = downloadURL;
      }
      
      // Handle display name update
      if (formData.name !== user.displayName) {
        updates.displayName = formData.name;
        dbUpdates.name = formData.name;
      }
      
      // Basic profile fields
      dbUpdates.namaPenerima = formData.namaPenerima || '';
      dbUpdates.nomorTelepon = formData.nomorTelepon || '';
      dbUpdates.alamat = formData.alamat || '';
      dbUpdates.detailLainnya = formData.detailLainnya || '';
      dbUpdates.updatedAt = now;
      
      // Handle coordinates if they exist in formData
      if (formData.coords) {
        dbUpdates.coords = {
          lat: Number(formData.coords.lat) || 0,
          lng: Number(formData.coords.lng) || 0
        };
      }
      
      // Update auth profile if there are changes
      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, updates);
      }
      
      // Update Firestore document
      await setDoc(doc(db, 'users', user.uid), dbUpdates, { merge: true });
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (formData.currentPassword && 
          (formData.email !== user.email || formData.newPassword)) {
        const credential = EmailAuthProvider.credential(
          user.email,
          formData.currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      
      if (formData.email !== user.email) {
        await updateEmail(auth.currentUser, formData.email);
      }
      
      if (formData.newPassword) {
        await updatePassword(auth.currentUser, formData.newPassword);
      }
      
      const dbUpdates = {
        username: formData.username,
        email: formData.email,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), dbUpdates, { merge: true });
      
      toast.success('Account settings updated successfully!');
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating account:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use by another account';
      }
      
      toast.error(`Failed to update account: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notifications: formData.notifications,
        updatedAt: new Date()
      });
      
      toast.success('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsLoading(true);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        privacy: formData.privacy,
        updatedAt: new Date()
      });
      
      toast.success('Privacy settings saved!');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(auth.currentUser);
      
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please reauthenticate to delete your account';
      }
      
      toast.error(`Failed to delete account: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationUpdate = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const newCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setFormData(prev => ({
        ...prev,
        coords: newCoords
      }));
      
      await updateDoc(doc(db, 'users', user.uid), {
        coords: newCoords,
        updatedAt: new Date()
      });
      
      toast.success('Location updated successfully!');
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error(`Failed to update location: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#bd2c30] to-[#88181c]">
            <h1 className="text-2xl font-bold text-white">Account Settings</h1>
            <p className="text-gray-100 mt-1">Manage your account preferences and security</p>
          </div>
          
          <div className="flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
              <nav className="flex md:flex-col overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsEditing(false);
                    }}
                    className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-white text-[#bd2c30] border-r-2 md:border-r-0 md:border-l-2 border-[#bd2c30]' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 p-6 md:p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
                      <p className="text-gray-600 text-sm">Update your personal details and photo</p>
                    </div>
                    {isEditing ? (
                      <div className="flex space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 sm:flex-none"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isLoading}
                          className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors disabled:opacity-70 flex-1 sm:flex-none"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          ) : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors w-full sm:w-auto"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
                            <img
                              src={formData.previewImage || formData.photoURL || '/default-avatar.png'}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {isEditing && (
                            <label className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <FaCamera className="text-white text-xl" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                        {isEditing && (
                          <p className="text-xs text-gray-500 mt-2 text-center">Max 2MB</p>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                              />
                              {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor="namaPenerima" className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient Name (for deliveries) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                id="namaPenerima"
                                name="namaPenerima"
                                value={formData.namaPenerima}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg ${errors.namaPenerima ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                              />
                              {errors.namaPenerima && (
                                <p className="mt-1 text-sm text-red-600">{errors.namaPenerima}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-gray-800">{formData.name}</h3>
                            <p className="text-gray-600">{user?.email}</p>
                            <p className="text-gray-500 text-sm">
                              Member since {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'a while'}
                            </p>
                            {formData.namaPenerima && (
                              <p className="text-gray-600 mt-2">
                                <span className="font-medium">Recipient Name:</span> {formData.namaPenerima}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isEditing && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="nomorTelepon" className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <PhoneInput
                              international
                              defaultCountry="ID"
                              value={formData.nomorTelepon}
                              onChange={handlePhoneChange}
                              className={`border rounded-lg ${errors.nomorTelepon ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                            />
                            {errors.nomorTelepon && (
                              <p className="mt-1 text-sm text-red-600">{errors.nomorTelepon}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Account Tab */}
              {activeTab === 'account' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Account Settings</h2>
                    <p className="text-gray-600 text-sm">Update your login credentials and username</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${errors.username ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                      />
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            placeholder="Required for changes"
                            className={`w-full px-3 py-2 border rounded-lg ${errors.currentPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                          />
                          {errors.currentPassword && (
                            <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            placeholder="Leave blank to keep current"
                            className={`w-full px-3 py-2 border rounded-lg ${errors.newPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                          />
                          {errors.newPassword && (
                            <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Leave blank to keep current"
                            className={`w-full px-3 py-2 border rounded-lg ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                          />
                          {errors.confirmPassword && (
                            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveAccount}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors disabled:opacity-70"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </span>
                        ) : 'Save Changes'}
                      </button>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-md font-medium text-gray-700 mb-3">Danger Zone</h3>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-medium text-red-800">Delete Account</h4>
                            <p className="text-sm text-red-600 mt-1">
                              Once you delete your account, there is no going back. All your data will be permanently removed.
                            </p>
                          </div>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={isLoading}
                            className="mt-3 sm:mt-0 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center justify-center"
                          >
                            <FaTrash className="mr-2" />
                            {isLoading ? 'Deleting...' : 'Delete Account'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Address Tab */}
              {activeTab === 'address' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">Address Information</h2>
                      <p className="text-gray-600 text-sm">Manage your delivery addresses and location</p>
                    </div>
                    {isEditing ? (
                      <div className="flex space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 sm:flex-none"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isLoading}
                          className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors disabled:opacity-70 flex-1 sm:flex-none"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          ) : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors w-full sm:w-auto"
                      >
                        Edit Address
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    {isEditing ? (
                      <>
                        <div>
                          <label htmlFor="alamat" className="block text-sm font-medium text-gray-700 mb-1">
                            Full Address <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="alamat"
                            name="alamat"
                            value={formData.alamat}
                            onChange={handleInputChange}
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg ${errors.alamat ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition`}
                          />
                          {errors.alamat && (
                            <p className="mt-1 text-sm text-red-600">{errors.alamat}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="detailLainnya" className="block text-sm font-medium text-gray-700 mb-1">
                            Additional Details (Optional)
                          </label>
                          <textarea
                            id="detailLainnya"
                            name="detailLainnya"
                            value={formData.detailLainnya}
                            onChange={handleInputChange}
                            rows={2}
                            placeholder="e.g., Building name, floor, landmarks"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#bd2c30] focus:border-[#bd2c30] outline-none transition"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location Coordinates
                          </label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1 w-full">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                                  <input
                                    type="text"
                                    value={formData.coords?.lat || ''}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                                  <input
                                    type="text"
                                    value={formData.coords?.lng || ''}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                  />
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleLocationUpdate}
                              disabled={isLoading}
                              className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors disabled:opacity-70 w-full sm:w-auto"
                            >
                              {isLoading ? (
                                <span className="flex items-center justify-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Updating...
                                </span>
                              ) : 'Update Location'}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Updating your location helps with accurate delivery estimates.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <h3 className="text-md font-medium text-gray-800 mb-2">Primary Address</h3>
                          <div className="space-y-2">
                            <p className="text-gray-600 whitespace-pre-line">{formData.alamat || 'No address saved yet'}</p>
                            {formData.detailLainnya && (
                              <p className="text-gray-500 whitespace-pre-line">{formData.detailLainnya}</p>
                            )}
                          </div>
                        </div>
                        
                        {formData.coords?.lat && formData.coords?.lng && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-md font-medium text-gray-800 mb-2">Location</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                                <p className="text-gray-800">{formData.coords.lat}</p>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                                <p className="text-gray-800">{formData.coords.lng}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
                    <p className="text-gray-600 text-sm">Choose how you receive notifications</p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Email Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="order-updates" className="text-sm text-gray-700">
                              Order updates
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Get notified about your order status
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="order-updates"
                              className="sr-only peer"
                              checked={formData.notifications.email.orderUpdates}
                              onChange={(e) => handleNotificationChange('email', 'orderUpdates', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#bd2c30] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bd2c30]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="promotions" className="text-sm text-gray-700">
                              Promotions
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Receive special offers and discounts
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="promotions"
                              className="sr-only peer"
                              checked={formData.notifications.email.promotions}
                              onChange={(e) => handleNotificationChange('email', 'promotions', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#bd2c30] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bd2c30]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="newsletter" className="text-sm text-gray-700">
                              Newsletter
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Get our monthly newsletter
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="newsletter"
                              className="sr-only peer"
                              checked={formData.notifications.email.newsletter}
                              onChange={(e) => handleNotificationChange('email', 'newsletter', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#bd2c30] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bd2c30]"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Push Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="order-push" className="text-sm text-gray-700">
                              Order updates
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Get real-time order notifications
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="order-push"
                              className="sr-only peer"
                              checked={formData.notifications.push.orderUpdates}
                              onChange={(e) => handleNotificationChange('push', 'orderUpdates', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#bd2c30] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bd2c30]"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="messages-push" className="text-sm text-gray-700">
                              Messages
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              Get notified about new messages
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="messages-push"
                              className="sr-only peer"
                              checked={formData.notifications.push.messages}
                              onChange={(e) => handleNotificationChange('push', 'messages', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#bd2c30] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#bd2c30]"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors disabled:opacity-70"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </span>
                        ) : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Privacy Settings</h2>
                    <p className="text-gray-600 text-sm">Control your data sharing and visibility</p>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Data Sharing</h3>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5 mt-0.5">
                            <input
                              id="analytics"
                              name="analytics"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                              checked={formData.privacy.analytics}
                              onChange={(e) => handlePrivacyChange('analytics', e.target.checked)}
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="analytics" className="font-medium text-gray-700">
                              Share data for analytics
                            </label>
                            <p className="text-gray-500 mt-1">
                              Help us improve our services by sharing anonymous usage data
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5 mt-0.5">
                            <input
                              id="personalized-ads"
                              name="personalized-ads"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                              checked={formData.privacy.personalizedAds}
                              onChange={(e) => handlePrivacyChange('personalizedAds', e.target.checked)}
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="personalized-ads" className="font-medium text-gray-700">
                              Personalized advertising
                            </label>
                            <p className="text-gray-500 mt-1">
                              See ads that are more relevant to your interests
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Visibility</h3>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5 mt-0.5">
                            <input
                              id="public-profile"
                              name="public-profile"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                              checked={formData.privacy.publicProfile}
                              onChange={(e) => handlePrivacyChange('publicProfile', e.target.checked)}
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="public-profile" className="font-medium text-gray-700">
                              Public profile
                            </label>
                            <p className="text-gray-500 mt-1">
                              Allow others to see your profile and reviews
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5 mt-0.5">
                            <input
                              id="show-email"
                              name="show-email"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                              checked={formData.privacy.showEmail}
                              onChange={(e) => handlePrivacyChange('showEmail', e.target.checked)}
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="show-email" className="font-medium text-gray-700">
                              Show email to sellers
                            </label>
                            <p className="text-gray-500 mt-1">
                              Allow sellers to see your email for order communications
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSavePrivacy}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#bd2c30] rounded-lg hover:bg-[#88181c] transition-colors disabled:opacity-70"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </span>
                        ) : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;