import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { motion } from 'framer-motion';
import { assets } from '../assets/assets';

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId || currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          setUserData({
            name: 'User Not Found',
            bio: 'This user does not exist or has been deleted',
            photoURL: assets.userAvatar
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, currentUser, db]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bd2c30]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto p-4 md:p-6"
    >
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-[#bd2c30] mb-6 transition-colors"
      >
        <i className="fa-solid fa-arrow-left mr-2"></i>
        Back
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#bd2c30] to-[#88181c] p-6 text-white">
          <div className="flex flex-col md:flex-row items-center">
            <motion.img
              src={userData?.photoURL || assets.userAvatar}
              alt="Profile"
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white object-cover shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            />
            <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold">{userData?.name || 'Anonymous'}</h1>
              <p className="text-white/90 mt-1">{userData?.bio || 'No bio yet'}</p>
              {userData?.location && (
                <div className="flex items-center justify-center md:justify-start mt-2">
                  <i className="fa-solid fa-location-dot mr-1"></i>
                  <span>{userData.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h2>
              <div className="space-y-2">
                <div className="flex items-center">
                  <i className="fa-solid fa-envelope text-gray-500 w-5 mr-3"></i>
                  <span>{userData?.email || 'Not provided'}</span>
                </div>
                {userData?.phone && (
                  <div className="flex items-center">
                    <i className="fa-solid fa-phone text-gray-500 w-5 mr-3"></i>
                    <span>{userData.phone}</span>
                  </div>
                )}
                {userData?.website && (
                  <div className="flex items-center">
                    <i className="fa-solid fa-globe text-gray-500 w-5 mr-3"></i>
                    <a href={userData.website} target="_blank" rel="noopener noreferrer" className="text-[#bd2c30] hover:underline">
                      {userData.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">About</h2>
              <p className="text-gray-600">
                {userData?.about || 'No additional information provided.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;