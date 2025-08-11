import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { getAuth, updateEmail, updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Make sure you have your firestore initialized
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
    coords: { lat: null, lng: null }
  });
  const [errors, setErrors] = useState({});
  const auth = getAuth();
  const storage = getStorage();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Fetch additional user data from Firestore
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
              photoURL: user?.photoURL || null
            }));
          } else {
            // Initialize with auth data if no document exists
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
    
    // Clear error when typing
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

  const validateForm = () => {
    const newErrors = {};
    
    if (activeTab === 'profile') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (!formData.namaPenerima.trim()) {
        newErrors.namaPenerima = 'Recipient name is required';
      }
      if (!formData.nomorTelepon) {
        newErrors.nomorTelepon = 'Phone number is required';
      }
      if (!formData.alamat.trim()) {
        newErrors.alamat = 'Address is required';
      }
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
      
      // Handle profile picture upload if changed
      if (formData.photoURL && typeof formData.photoURL !== 'string') {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, formData.photoURL);
        const downloadURL = await getDownloadURL(storageRef);
        updates.photoURL = downloadURL;
        dbUpdates.photoURL = downloadURL;
      }
      
      // Update display name if changed
      if (formData.name !== user.displayName) {
        updates.displayName = formData.name;
        dbUpdates.name = formData.name;
      }
      
      // Update Firestore user data
      dbUpdates.namaPenerima = formData.namaPenerima;
      dbUpdates.nomorTelepon = formData.nomorTelepon;
      dbUpdates.alamat = formData.alamat;
      dbUpdates.detailLainnya = formData.detailLainnya;
      dbUpdates.updatedAt = new Date();
      
      // Update auth profile if there are changes
      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, updates);
      }
      
      // Update Firestore document
      await setDoc(doc(db, 'users', user.uid), dbUpdates, { merge: true });
      
      toast.success('Profile updated successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Reauthenticate user if changing sensitive information
      if (formData.currentPassword && 
          (formData.email !== user.email || formData.newPassword)) {
        const credential = EmailAuthProvider.credential(
          user.email,
          formData.currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      
      // Update email if changed
      if (formData.email !== user.email) {
        await updateEmail(auth.currentUser, formData.email);
      }
      
      // Update password if changed
      if (formData.newPassword) {
        await updatePassword(auth.currentUser, formData.newPassword);
      }
      
      // Update Firestore document with account changes
      const dbUpdates = {
        username: formData.username,
        email: formData.email,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), dbUpdates, { merge: true });
      
      toast.success('Account settings updated successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Reset password fields
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
      
      toast.error(`Failed to update account: ${errorMessage}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
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
      // First delete the Firestore document
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Then delete the auth user
      await deleteUser(auth.currentUser);
      
      toast.success('Account deleted successfully', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Redirect to home or login page after deletion
      logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please reauthenticate to delete your account';
      }
      
      toast.error(`Failed to delete account: ${errorMessage}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
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
      
      // Update local state
      setFormData(prev => ({
        ...prev,
        coords: newCoords
      }));
      
      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        coords: newCoords,
        updatedAt: new Date()
      });
      
      toast.success('Location updated successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error(`Failed to update location: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and preferences</p>
          </div>
          
          <div className="flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
              <nav className="flex md:flex-col overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'profile' ? 'bg-white text-[#bd2c30] border-r-2 border-[#bd2c30]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <i className="fa-solid fa-user mr-2"></i>
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'account' ? 'bg-white text-[#bd2c30] border-r-2 border-[#bd2c30]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <i className="fa-solid fa-lock mr-2"></i>
                  Account
                </button>
                <button
                  onClick={() => setActiveTab('address')}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'address' ? 'bg-white text-[#bd2c30] border-r-2 border-[#bd2c30]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <i className="fa-solid fa-map-marker-alt mr-2"></i>
                  Address
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'notifications' ? 'bg-white text-[#bd2c30] border-r-2 border-[#bd2c30]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <i className="fa-solid fa-bell mr-2"></i>
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === 'privacy' ? 'bg-white text-[#bd2c30] border-r-2 border-[#bd2c30]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <i className="fa-solid fa-shield-halved mr-2"></i>
                  Privacy
                </button>
              </nav>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-800">Profile Information</h2>
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors disabled:opacity-70"
                        >
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <img
                            src={formData.previewImage || formData.photoURL || '/default-avatar.png'}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                          />
                          {isEditing && (
                            <label className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md cursor-pointer hover:bg-gray-100">
                              <i className="fa-solid fa-camera text-gray-700"></i>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 w-full">
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                              </label>
                              <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                              />
                              {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor="namaPenerima" className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient Name (for deliveries)
                              </label>
                              <input
                                type="text"
                                id="namaPenerima"
                                name="namaPenerima"
                                value={formData.namaPenerima}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-md ${errors.namaPenerima ? 'border-red-500' : 'border-gray-300'}`}
                              />
                              {errors.namaPenerima && (
                                <p className="mt-1 text-sm text-red-600">{errors.namaPenerima}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{formData.name}</h3>
                            <p className="text-gray-600">{user?.email}</p>
                            <p className="text-gray-500 text-sm mt-2">
                              Member since {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'a while'}
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
                              Phone Number
                            </label>
                            <PhoneInput
                              international
                              defaultCountry="ID"
                              value={formData.nomorTelepon}
                              onChange={handlePhoneChange}
                              className={`border rounded-md ${errors.nomorTelepon ? 'border-red-500' : 'border-gray-300'}`}
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
                  <h2 className="text-lg font-medium text-gray-800 mb-6">Account Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
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
                            className={`w-full px-3 py-2 border rounded-md ${errors.currentPassword ? 'border-red-500' : 'border-gray-300'}`}
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
                            className={`w-full px-3 py-2 border rounded-md ${errors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
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
                            className={`w-full px-3 py-2 border rounded-md ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
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
                        className="px-4 py-2 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors disabled:opacity-70"
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                    
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Danger Zone</h3>
                      <div className="p-4 bg-red-50 rounded-md border border-red-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-medium text-red-800">Delete Account</h4>
                            <p className="text-sm text-red-600 mt-1">
                              Once you delete your account, there is no going back. Please be certain.
                            </p>
                          </div>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={isLoading}
                            className="mt-3 sm:mt-0 px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-70"
                          >
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
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-800">Address Information</h2>
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors disabled:opacity-70"
                        >
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors"
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
                            Full Address
                          </label>
                          <textarea
                            id="alamat"
                            name="alamat"
                            value={formData.alamat}
                            onChange={handleInputChange}
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-md ${errors.alamat ? 'border-red-500' : 'border-gray-300'}`}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Location Coordinates
                          </label>
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                                  <input
                                    type="text"
                                    value={formData.coords?.lat || ''}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                                  <input
                                    type="text"
                                    value={formData.coords?.lng || ''}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                  />
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleLocationUpdate}
                              disabled={isLoading}
                              className="px-4 py-2 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors disabled:opacity-70"
                            >
                              {isLoading ? 'Updating...' : 'Update Location'}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Updating your location helps with accurate delivery estimates.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <p className="text-gray-600 whitespace-pre-line">{formData.alamat}</p>
                          {formData.detailLainnya && (
                            <p className="text-gray-500 whitespace-pre-line">{formData.detailLainnya}</p>
                          )}
                        </div>
                        
                        {formData.coords?.lat && formData.coords?.lng && (
                          <div>
                            <h3 className="text-md font-medium text-gray-800 mb-2">Location</h3>
                            <div className="bg-gray-100 p-4 rounded-md">
                              <div className="grid grid-cols-2 gap-4">
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
                  <h2 className="text-lg font-medium text-gray-800 mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Email Notifications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="order-updates" className="text-sm text-gray-700">
                              Order updates
                            </label>
                            <p className="text-xs text-gray-500">
                              Get notified about your order status
                            </p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                              type="checkbox"
                              id="order-updates"
                              className="sr-only"
                              defaultChecked
                            />
                            <label
                              htmlFor="order-updates"
                              className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                            >
                              <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out translate-x-4"></span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="promotions" className="text-sm text-gray-700">
                              Promotions
                            </label>
                            <p className="text-xs text-gray-500">
                              Receive special offers and discounts
                            </p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                              type="checkbox"
                              id="promotions"
                              className="sr-only"
                              defaultChecked
                            />
                            <label
                              htmlFor="promotions"
                              className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                            >
                              <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out translate-x-4"></span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="newsletter" className="text-sm text-gray-700">
                              Newsletter
                            </label>
                            <p className="text-xs text-gray-500">
                              Get our monthly newsletter
                            </p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                              type="checkbox"
                              id="newsletter"
                              className="sr-only"
                            />
                            <label
                              htmlFor="newsletter"
                              className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                            >
                              <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Push Notifications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="order-push" className="text-sm text-gray-700">
                              Order updates
                            </label>
                            <p className="text-xs text-gray-500">
                              Get real-time order notifications
                            </p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                              type="checkbox"
                              id="order-push"
                              className="sr-only"
                              defaultChecked
                            />
                            <label
                              htmlFor="order-push"
                              className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                            >
                              <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out translate-x-4"></span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label htmlFor="messages-push" className="text-sm text-gray-700">
                              Messages
                            </label>
                            <p className="text-xs text-gray-500">
                              Get notified about new messages
                            </p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input
                              type="checkbox"
                              id="messages-push"
                              className="sr-only"
                              defaultChecked
                            />
                            <label
                              htmlFor="messages-push"
                              className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                            >
                              <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out translate-x-4"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button className="px-4 py-2 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors">
                        Save Preferences
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
                  <h2 className="text-lg font-medium text-gray-800 mb-6">Privacy Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Data Sharing</h3>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="analytics"
                              name="analytics"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                              defaultChecked
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="analytics" className="font-medium text-gray-700">
                              Share data for analytics
                            </label>
                            <p className="text-gray-500">
                              Help us improve our services by sharing anonymous usage data
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="personalized-ads"
                              name="personalized-ads"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="personalized-ads" className="font-medium text-gray-700">
                              Personalized advertising
                            </label>
                            <p className="text-gray-500">
                              See ads that are more relevant to your interests
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Visibility</h3>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="public-profile"
                              name="public-profile"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                              defaultChecked
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="public-profile" className="font-medium text-gray-700">
                              Public profile
                            </label>
                            <p className="text-gray-500">
                              Allow others to see your profile and reviews
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="show-email"
                              name="show-email"
                              type="checkbox"
                              className="focus:ring-[#bd2c30] h-4 w-4 text-[#bd2c30] border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="show-email" className="font-medium text-gray-700">
                              Show email to sellers
                            </label>
                            <p className="text-gray-500">
                              Allow sellers to see your email for order communications
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button className="px-4 py-2 text-sm text-white bg-[#bd2c30] rounded-md hover:bg-[#88181c] transition-colors">
                        Save Settings
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