import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Modal from "react-modal";
import { FiUpload, FiSettings, FiPackage, FiHome, FiEye, FiHeart, FiDollarSign, FiShoppingBag, FiMenu, FiX } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

Modal.setAppElement('#root');

const SellerDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [publishingId, setPublishingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  const fetchUserData = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
        await fetchProducts(docSnap.data().sellerId || auth.currentUser.uid);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching user data: ", error);
      setLoading(false);
    }
  }, [auth.currentUser, db]);

  const fetchProducts = useCallback(async (sellerId) => {
    try {
      // Fetch active products
      const productsRef = collection(db, 'products');
      const productsQuery = query(productsRef, where('sellerId', '==', sellerId));
      const productsSnapshot = await getDocs(productsQuery);
      
      // Fetch draft products
      const draftsRef = collection(db, 'drafts');
      const draftsQuery = query(draftsRef, where('sellerId', '==', sellerId));
      const draftsSnapshot = await getDocs(draftsQuery);
      
      // Combine results
      const productsData = [];
      
      productsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data(), status: 'active' });
      });
      
      draftsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data(), status: 'draft' });
      });
      
      setProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products: ", error);
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleUploadClick = () => {
    if (!userData?.alamat) {
      setIsModalOpen(true);
    } else {
      navigate("/sell");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Pagi";
    if (hour >= 11 && hour < 15) return "Siang";
    if (hour >= 15 && hour < 18) return "Sore";
    return "Malam";
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  // Delete active product handler
  const deleteProduct = async (productId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    setDeletingId(productId);
    try {
      const productRef = doc(db, 'products', productId);
      await deleteDoc(productRef);
      await fetchUserData(); // refresh product list
      alert('Product deleted successfully.');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const activeProducts = products.filter(product => product.status === 'active');
  const draftProducts = products.filter(product => product.status === 'draft');

  const publishDraft = async (draftId) => {
    setPublishingId(draftId);
    try {
      // Get the draft document
      const draftRef = doc(db, 'drafts', draftId);
      const draftSnap = await getDoc(draftRef);
      
      if (!draftSnap.exists()) {
        throw new Error('Draft not found');
      }
      
      // Add to products collection
      const productsRef = collection(db, 'products');
      await addDoc(productsRef, {
        ...draftSnap.data(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Delete from drafts collection
      await deleteDoc(draftRef);
      
      // Refresh the product list
      await fetchUserData();
      
      // Show success message
      alert('Product published successfully!');
    } catch (error) {
      console.error('Error publishing draft:', error);
      alert('Failed to publish draft. Please try again.');
    } finally {
      setPublishingId(null);
    }
  };

  if (loading || !userData) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
        {/* Mobile Skeleton Sidebar */}
        <div className="md:hidden flex justify-between items-center p-4 bg-white border-b border-gray-200">
          <Skeleton width={100} height={24} />
          <Skeleton width={40} height={40} circle />
        </div>
        
        {/* Desktop Skeleton Sidebar */}
        <div className="hidden md:block w-64 border-r bg-white p-6 border-gray-200">
          <div className="flex items-center mb-8">
            <Skeleton circle width={48} height={48} />
            <div className="ml-3">
              <Skeleton width={100} height={20} />
              <Skeleton width={80} height={16} />
            </div>
          </div>
          <Skeleton height={40} className="mb-6" />
          <div className="space-y-2">
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-8">
          <div className="mb-6 md:mb-8">
            <Skeleton width={200} height={28} className="mb-2" />
            <Skeleton width={300} height={20} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={80} />
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height={120} />
            ))}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={200} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden flex justify-between items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <h1 className="text-xl font-bold">{userData?.name}</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md focus:outline-none"
        >
          {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 md:hidden overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex items-center mb-8">
                <img
                  src={userData.photoURL || '/default-avatar.png'}
                  alt="Profile"
                  className="w-12 h-12 rounded-full mr-3 object-cover border border-gray-200"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-avatar.png';
                  }}
                />
                <div>
                  <h2 className="font-bold text-lg truncate max-w-[160px]">{userData.name}</h2>
                  <p className="text-sm text-gray-500 truncate max-w-[160px]">@{userData.username}</p>
                </div>
              </div>
              
              <button 
                onClick={handleUploadClick}
                className="flex items-center justify-center bg-black hover:bg-gray-800 transition-colors text-white px-4 py-3 rounded-lg mb-6 w-full cursor-pointer"
              >
                <FiUpload className="mr-2" />
                Upload produk
              </button>
              
              <nav className="space-y-1">
                <NavLink
                  to="/seller-dashboard"
                  end
                  className={({isActive}) => `flex items-center px-3 py-3 rounded-lg ${isActive ? 'bg-[#bd2c3144] text-[#bd2c30]' : 'hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FiHome className="mr-3" />
                  Overview
                </NavLink>
                <NavLink
                  to="/products"
                  className={({isActive}) => `flex items-center px-3 py-3 rounded-lg ${isActive ? 'bg-[#bd2c3144] text-[#bd2c30]' : 'hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FiPackage className="mr-3" />
                  Products
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({isActive}) => `flex items-center px-3 py-3 rounded-lg ${isActive ? 'bg-[#bd2c3144] text-[#bd2c30]' : 'hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FiSettings className="mr-3" />
                  Settings
                </NavLink>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 border-r bg-white p-6 border-gray-200 sticky top-0 h-screen flex-shrink-0">
        <div className="flex flex-col w-full">
          <div className="flex items-center mb-8">
            <img
              src={userData.photoURL || '/default-avatar.png'}
              alt="Profile"
              className="w-12 h-12 rounded-full mr-3 object-cover border border-gray-200"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-avatar.png';
              }}
            />
            <div>
              <h2 className="font-bold text-lg truncate max-w-[160px]">{userData.name}</h2>
              <p className="text-sm text-gray-500 truncate max-w-[160px]">@{userData.username}</p>
            </div>
          </div>
          
          <button 
            onClick={handleUploadClick}
            className="flex items-center justify-center bg-black hover:bg-gray-800 transition-colors text-white px-4 py-3 rounded-lg mb-6 w-full cursor-pointer"
          >
            <FiUpload className="mr-2" />
            Upload produk
          </button>
          
          <nav className="space-y-1">
            <NavLink
              to="/seller"
              end
              className={({isActive}) => `flex items-center px-3 py-3 rounded-lg ${isActive ? 'bg-[#bd2c3144] text-[#bd2c30]' : 'hover:bg-gray-100'}`}
            >
              <FiHome className="mr-3" />
              Overview
            </NavLink>
            <NavLink
              to="/seller/products"
              className={({isActive}) => `flex items-center px-3 py-3 rounded-lg ${isActive ? 'bg-[#bd2c3144] text-[#bd2c30]' : 'hover:bg-gray-100'}`}
            >
              <FiPackage className="mr-3" />
              Products
            </NavLink>
            <NavLink
              to="/seller/settings"
              className={({isActive}) => `flex items-center px-3 py-3 rounded-lg ${isActive ? 'bg-[#bd2c3144] text-[#bd2c30]' : 'hover:bg-gray-100'}`}
            >
              <FiSettings className="mr-3" />
              Settings
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 md:mb-8"
        >
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">
            {getGreeting()}, {userData?.name}{" "}
            <span role="img" aria-label="wave">
              👋
            </span>
          </h1>
          <p className="text-gray-600 text-sm md:text-base">Berikut adalah status toko kamu hari ini</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border p-3 md:p-4 mb-6 md:mb-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1 md:mb-2">
                <FiDollarSign className="text-gray-400 mr-2" />
                <h3 className="text-gray-500 text-xs md:text-sm">Wallet Balance</h3>
              </div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">
                {formatCurrency(userData.wallet)}
              </p>
            </div>
            
            <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1 md:mb-2">
                <FiShoppingBag className="text-gray-400 mr-2" />
                <h3 className="text-gray-500 text-xs md:text-sm">Total Pendapatan</h3>
              </div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">
                {formatCurrency(userData.totalIncome)}
              </p>
            </div>
            
            <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1 md:mb-2">
                <FiPackage className="text-gray-400 mr-2" />
                <h3 className="text-gray-500 text-xs md:text-sm">Produk Terjual</h3>
              </div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">{userData.productsSold || 0}</p>
            </div>
            
            <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-1 md:mb-2">
                <FiEye className="text-gray-400 mr-2" />
                <h3 className="text-gray-500 text-xs md:text-sm">Produk Aktif</h3>
              </div>
              <p className="text-lg md:text-xl lg:text-2xl font-bold">{activeProducts.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Product Stats */}
        <div className="border-t pt-4 md:pt-6 mb-6 md:mb-8 border-gray-200">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">Product Analytics</h2>
          <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-1 md:mb-2">
                  <FiEye className="text-gray-400 mr-2" />
                  <h3 className="text-gray-500 text-xs md:text-sm">Total Views</h3>
                </div>
                <p className="text-lg md:text-xl lg:text-2xl font-bold">
                  {products.reduce((sum, product) => sum + (product.views || 0), 0).toLocaleString()}
                </p>
              </div>
              
              <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-1 md:mb-2">
                  <FiHeart className="text-gray-400 mr-2" />
                  <h3 className="text-gray-500 text-xs md:text-sm">Total Likes</h3>
                </div>
                <p className="text-lg md:text-xl lg:text-2xl font-bold">
                  {products.reduce((sum, product) => sum + (product.likes || 0), 0).toLocaleString()}
                </p>
              </div>
              
              <div className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-1 md:mb-2">
                  <FiPackage className="text-gray-400 mr-2" />
                  <h3 className="text-gray-500 text-xs md:text-sm">Total Products</h3>
                </div>
                <p className="text-lg md:text-xl lg:text-2xl font-bold">{products.length.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Listings */}
        <div className="border-t pt-4 md:pt-6 mb-6 md:mb-8 border-gray-200">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3 md:gap-0">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Your Products</h2>
            <div className="flex border rounded-lg overflow-hidden self-start md:self-auto">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium ${activeTab === 'active' ? 'bg-[#bd2c30] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Active ({activeProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium ${activeTab === 'drafts' ? 'bg-[#bd2c30] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Drafts ({draftProducts.length})
              </button>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'active' ? (
                activeProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {activeProducts.map((product) => (
                      <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative pt-[100%]">
                          <img 
                            src={product.photos[0] || '/product-placeholder.jpg'} 
                            alt={product.title} 
                            className="absolute top-0 left-0 w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/product-placeholder.jpg';
                            }}
                          />
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="font-bold text-base md:text-lg mb-1 truncate">{product.title}</h3>
                          <p className="text-gray-600 text-sm md:text-base mb-1 md:mb-2">{formatCurrency(product.price)}</p>
                          <div className="flex justify-between text-xs md:text-sm text-gray-500 mb-1 md:mb-2">
                            <span className="flex items-center">
                              <FiEye className="mr-1" /> {product.views || 0}
                            </span>
                            <span className="flex items-center">
                              <FiHeart className="mr-1" /> {product.likes || 0}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            disabled={deletingId === product.id}
                            className={`w-full text-center text-red-600 border border-red-600 rounded-md px-2 py-1 text-xs md:text-sm hover:bg-red-600 hover:text-white transition-colors ${
                              deletingId === product.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {deletingId === product.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8 text-center">
                    <i className="fa-regular fa-face-frown text-2xl md:text-3xl text-gray-400 mb-3 md:mb-4"></i>
                    <p className="text-gray-500 text-sm md:text-base mb-3 md:mb-4">You don't have any active products yet.</p>
                    <button 
                      onClick={handleUploadClick}
                      className="flex items-center justify-center mx-auto bg-black hover:bg-gray-800 transition-colors text-white px-3 py-1 md:px-4 md:py-2 rounded-lg cursor-pointer text-sm md:text-base"
                    >
                      <FiUpload className="mr-1 md:mr-2" />
                      Add your first product
                    </button>
                  </div>
                )
              ) : (
                draftProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {draftProducts.map((product) => (
                      <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative pt-[100%]">
                          <img 
                            src={product.photos[0] || '/product-placeholder.jpg'} 
                            alt={product.title} 
                            className="absolute top-0 left-0 w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/product-placeholder.jpg';
                            }}
                          />
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="font-bold text-base md:text-lg mb-1 truncate">{product.title}</h3>
                          <p className="text-gray-600 text-sm md:text-base mb-1 md:mb-2">{formatCurrency(product.price)}</p>
                          <div className="flex justify-between text-xs md:text-sm">
                            <button 
                              onClick={() => {
                                navigate(`/edit-product/${product.id}?isDraft=true`);
                                setIsMobileMenuOpen(false);
                              }}
                              className="text-blue-500 hover:text-blue-700 flex items-center"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => publishDraft(product.id)}
                              disabled={publishingId === product.id}
                              className={`text-green-500 hover:text-green-700 flex items-center ${
                                publishingId === product.id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {publishingId === product.id ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 md:h-4 md:w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Publishing...
                                </>
                              ) : (
                                'Publish'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8 text-center">
                    <i className="fa-regular fa-face-frown text-2xl md:text-3xl text-gray-400 mb-3 md:mb-4"></i>
                    <p className="text-gray-500 text-sm md:text-base">No drafts currently saved.</p>
                    <p className="text-gray-400 mt-1 md:mt-2 text-xs md:text-sm">
                      They will appear here when you save products as drafts.
                    </p>
                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Address Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Set Pickup Address"
        className="modal-content bg-white rounded-xl p-0 max-w-md w-full mx-4"
        overlayClassName="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        closeTimeoutMS={200}
      >
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Tentukan Alamat Pickup</h2>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4 md:mb-6">
            <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">
              Untuk mulai menjual, kamu perlu mengatur alamat pickup terlebih dahulu.
              Alamat ini akan digunakan untuk pengambilan produk oleh pembeli.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 md:h-5 md:w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2 md:ml-3">
                  <p className="text-xs md:text-sm text-yellow-700">
                    Kamu tidak akan bisa mengupload produk sampai alamat pickup diatur.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 md:space-x-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1 md:px-4 md:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 text-xs md:text-sm"
            >
              Nanti Saja
            </button>
            <NavLink
              to="/setaddress"
              className="px-3 py-1 md:px-4 md:py-2 bg-[#bd2c30] hover:bg-[#a0262a] transition-colors text-white rounded-lg text-xs md:text-sm"
              onClick={() => setIsModalOpen(false)}
            >
              Atur Alamat Sekarang
            </NavLink>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SellerDashboard;
